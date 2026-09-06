import { NextRequest, NextResponse } from "next/server";
import { loadCustomerIdentity } from "@/lib/customer-account";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { europeanCountryValue } from "@/lib/european-countries";
import { getProductPhoto } from "@/lib/market-media";
import { enforceRateLimit } from "@/lib/redis";
import { wholesaleAvailablePacks, wholesaleLineEconomics, wholesaleTiers } from "@/lib/wholesale";
import { createWholesaleQuoteReference, WholesaleQuoteRequestInput } from "@/lib/wholesale-quote";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "account");
  if (limited) return limited;

  const parsed = WholesaleQuoteRequestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La demande de devis est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const isFr = input.locale === "fr";
  const country = europeanCountryValue(input.country);
  if (!country) {
    return NextResponse.json({ error: isFr ? "Choisissez un pays de livraison européen pris en charge." : "Choose a supported European delivery country." }, { status: 400 });
  }

  try {
    const session = await authorizeCustomerRequest(request);
    if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
    const customerIdentity = await loadCustomerIdentity(session).catch(() => null);
    if (!customerIdentity) return NextResponse.json({ error: isFr ? "Votre espace client est introuvable ou inactif." : "Your customer account is missing or inactive." }, { status: 403 });
    const products = input.items.length
      ? await db.product.findMany({
          where: { id: { in: input.items.map((item) => item.productId) }, status: "published", isWholesale: true, wholesalePrice: { not: null } },
          include: { translations: true, category: true },
        })
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== input.items.length) {
      return NextResponse.json({ error: isFr ? "Un produit sélectionné n'est plus disponible sur le marché de gros." : "A selected product is no longer available in the wholesale market." }, { status: 409 });
    }

    const items = input.items.map((line) => {
      const product = productsById.get(line.productId)!;
      const tiers = wholesaleTiers({
        wholesaleMinPacks: product.wholesaleMinPacks,
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        wholesaleTier2MinPacks: product.wholesaleTier2MinPacks,
        wholesaleTier2Price: product.wholesaleTier2Price ? Number(product.wholesaleTier2Price) : null,
        wholesaleTier3MinPacks: product.wholesaleTier3MinPacks,
        wholesaleTier3Price: product.wholesaleTier3Price ? Number(product.wholesaleTier3Price) : null,
      });
      const availablePacks = wholesaleAvailablePacks(product.stockQty, product.reservedQty, product.wholesaleUnitsPerPack);
      if (line.packs < product.wholesaleMinPacks || line.packs > availablePacks || !tiers.length) {
        throw new WholesaleAvailabilityError(product.traditionalName, availablePacks, product.wholesaleMinPacks);
      }

      const economics = wholesaleLineEconomics(Number(product.price), product.wholesaleUnitsPerPack, tiers, line.packs);
      const fr = product.translations.find((translation) => translation.locale === "fr") || product.translations[0];
      const en = product.translations.find((translation) => translation.locale === "en") || fr;
      return {
        productId: product.id,
        productNameFr: fr?.name || product.traditionalName,
        productNameEn: en?.name || fr?.name || product.traditionalName,
        sku: product.sku,
        imageUrl: getProductPhoto({
          traditionalName: product.traditionalName,
          name: fr?.name,
          description: fr?.description,
          imageUrl: product.imageUrl,
          imageEmoji: product.imageEmoji,
          category: product.category ? { slug: product.category.slug, name: product.category.nameFr } : null,
        }),
        packLabel: product.wholesalePackLabel || (isFr ? "Colis professionnel" : "Professional case"),
        packs: line.packs,
        unitsPerPack: product.wholesaleUnitsPerPack,
        unitPrice: economics.casePrice,
        lineTotal: economics.lineTotal,
        thermalClass: product.thermalClass,
      };
    });
    const estimatedSubtotal = roundMoney(items.reduce((total, item) => total + item.lineTotal, 0));
    const totalPacks = items.reduce((total, item) => total + item.packs, 0);
    const reference = createWholesaleQuoteReference();

    const quote = await db.$transaction(async (transaction) => {
      const created = await transaction.wholesaleQuote.create({
        data: {
          customerId: customerIdentity.customerId,
          reference,
          status: "new",
          locale: input.locale,
          company: input.company,
          contactName: input.contactName,
          email: input.email.toLowerCase(),
          phone: input.phone,
          country,
          postalCode: input.postalCode.toUpperCase(),
          deliveryRequirements: input.deliveryRequirements,
          additionalNeeds: input.additionalNeeds || null,
          estimatedSubtotal,
          totalPacks,
          items: { create: items },
        },
        include: { items: true },
      });
      await transaction.auditLog.create({
        data: {
          action: "wholesale_quote_create",
          entityType: "WholesaleQuote",
          entityId: created.id,
          after: JSON.stringify({ reference, customerId: customerIdentity.customerId, company: input.company, country, totalPacks, itemCount: items.length, estimatedSubtotal }),
          reason: "Demande créée depuis le marché de gros",
          ip: clientIp(request),
        },
      });
      return created;
    });

    return NextResponse.json({
      quote: {
        id: quote.id,
        reference: quote.reference,
        status: quote.status,
        estimatedSubtotal: Number(quote.estimatedSubtotal),
        totalPacks: quote.totalPacks,
        currency: quote.currency,
        createdAt: quote.createdAt,
        tracked: true,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof WholesaleAvailabilityError) {
      const detail = isFr
        ? `${error.productName} : ${error.availablePacks} colis disponible(s), minimum ${error.minimumPacks}.`
        : `${error.productName}: ${error.availablePacks} case(s) available, minimum ${error.minimumPacks}.`;
      return NextResponse.json({ error: detail }, { status: 409 });
    }
    return NextResponse.json({ error: isFr ? "Le dossier de devis n'a pas pu être enregistré. Réessayez sans modifier votre sélection." : "The quote file could not be saved. Try again without changing your selection." }, { status: 500 });
  }
}

class WholesaleAvailabilityError extends Error {
  constructor(public productName: string, public availablePacks: number, public minimumPacks: number) {
    super(productName);
  }
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clientIp(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

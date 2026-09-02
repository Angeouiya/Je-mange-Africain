const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

type InvoiceCompany = {
  name: string;
  address: string;
  registration: string;
  vat: string;
  email: string;
  phone: string;
};

type InvoiceOptions = {
  baseUrl: string;
  company?: Partial<InvoiceCompany>;
};

const absoluteAssetUrl = (value: unknown, baseUrl: string) => {
  if (!value) return "";
  try {
    const url = new URL(String(value), baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

export function buildOrderInvoiceHtml(order: Record<string, any>, locale: "fr" | "en", options: InvoiceOptions) {
  const isFr = locale === "fr";
  const items = Array.isArray(order.items) ? order.items : [];
  const language = isFr ? "fr-FR" : "en-GB";
  const currencyCode = /^[A-Z]{3}$/.test(String(order.currency || "").toUpperCase()) ? String(order.currency).toUpperCase() : "EUR";
  const currency = new Intl.NumberFormat(language, { style: "currency", currency: currencyCode });
  const formatMoney = (value: unknown) => currency.format(Number(value || 0));
  const company: InvoiceCompany = {
    name: options.company?.name || "Je mange Africain",
    address: options.company?.address || "",
    registration: options.company?.registration || "",
    vat: options.company?.vat || "",
    email: options.company?.email || "bonjour@je-mange-africain.com",
    phone: options.company?.phone || "",
  };
  const companyDetails = [
    company.address,
    company.registration ? `${isFr ? "Immatriculation" : "Registration"}: ${company.registration}` : "",
    company.vat ? `${isFr ? "N° TVA" : "VAT no."}: ${company.vat}` : "",
    company.email,
    company.phone,
    "je-mange-africain.com",
  ].filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const deliveryDetails = [
    order.deliveryName,
    order.deliveryAddress,
    [order.deliveryPostalCode, order.deliveryCity].filter(Boolean).join(" "),
    order.deliveryCountry,
    order.customerEmail,
    order.customerPhone,
  ].filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const rows = items.map((item: Record<string, any>) => {
    const name = (isFr ? item.nameFr : item.nameEn) || item.name || item.nameFr || item.nameEn || (isFr ? "Produit" : "Product");
    const quantity = Number(item.qty || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const total = Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.qty || 0));
    const imageUrl = absoluteAssetUrl(item.imageUrl, options.baseUrl);
    const detail = [item.sku ? `SKU ${item.sku}` : "", isFr ? item.recipeNameFr : item.recipeNameEn].filter(Boolean).join(" · ");
    return `<tr><td><div class="item">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : ""}<div><strong>${escapeHtml(name)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div></div></td><td class="number">${escapeHtml(quantity)}</td><td class="number">${escapeHtml(formatMoney(unitPrice))}</td><td class="number"><strong>${escapeHtml(formatMoney(total))}</strong></td></tr>`;
  }).join("");
  const payment = Array.isArray(order.payments) ? order.payments[0] : null;
  const reference = payment?.reference || order.paymentReference || "";
  const paymentMethod = payment?.method || order.paymentMethod || "";
  const paymentStatus = String(payment?.status || "").toLowerCase();
  const paymentStatusLabel = paymentStatus === "captured"
    ? (isFr ? "Payée" : "Paid")
    : paymentStatus === "refunded"
      ? (isFr ? "Remboursée" : "Refunded")
      : paymentStatus === "failed"
        ? (isFr ? "Échec du paiement" : "Payment failed")
        : (isFr ? "Statut enregistré avec la commande" : "Status recorded with the order");
  const deliveryServiceLabel = ({
    standard: isFr ? "Livraison standard" : "Standard delivery",
    express: isFr ? "Livraison express" : "Express delivery",
    relay: isFr ? "Point relais" : "Collection point",
  } as Record<string, string>)[String(order.deliverySlot || "")] || order.deliverySlot || "";
  const summaryEntries: Array<[string, number]> = [
    [isFr ? "Sous-total produits" : "Products subtotal", Number(order.subtotal || 0)],
    [isFr ? "Livraison" : "Delivery", Number(order.shippingCost || 0)],
    [isFr ? "Dont TVA incluse" : "Including VAT", Number(order.vatAmount || 0)],
  ];
  if (Number(order.promoDiscount || 0) > 0) {
    summaryEntries.splice(1, 0, [isFr ? "Remise" : "Discount", -Number(order.promoDiscount)]);
  }
  const summaryRows = summaryEntries.map(([label, value]) => `<div class="summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatMoney(value))}</strong></div>`).join("");
  const invoiceNumber = order.number || (isFr ? "Facture" : "Invoice");
  const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" });
  const logoUrl = absoluteAssetUrl("/brand/logo-mark.png", options.baseUrl);
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(isFr ? "Facture" : "Invoice")} ${escapeHtml(invoiceNumber)}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f3f1ed;color:#25231f;font:13px Arial,sans-serif;line-height:1.5}.page{width:min(900px,100%);margin:24px auto;background:#fff;padding:42px}.brand{display:flex;align-items:center;gap:16px}.brand img{width:76px;height:76px;object-fit:contain}.brand h1{margin:0;font-size:20px}.brand p,.meta p{margin:2px 0;color:#68645e}.header{display:flex;justify-content:space-between;gap:32px;padding-bottom:24px;border-bottom:3px solid #c84626}.meta{text-align:right}.meta strong{display:block;color:#c84626;font-size:22px}.addresses{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}.address{border-top:1px solid #ddd8cf;padding-top:12px}.label{margin-bottom:7px;color:#77716a;font-size:10px;font-weight:700;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{background:#252b25;color:#fff;font-size:10px;text-transform:uppercase}th,td{padding:11px 10px;text-align:left;border-bottom:1px solid #e5e1db}.item{display:flex;align-items:center;gap:10px}.item img{width:42px;height:42px;flex:0 0 42px;border-radius:6px;object-fit:cover}.item small{display:block;color:#77716a}.number{text-align:right;white-space:nowrap}.summary{width:min(360px,100%);margin:24px 0 0 auto}.summary-row{display:flex;justify-content:space-between;gap:24px;padding:6px 0}.grand-total{margin-top:7px;padding:13px 0;border-top:2px solid #252b25;border-bottom:2px solid #252b25;color:#c84626;font-size:18px}.payment{margin-top:28px;padding:14px;border-left:3px solid #497527;background:#f5f3ef}.payment strong{color:#252b25}.payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:6px}.footer{margin-top:36px;padding-top:18px;border-top:1px solid #ddd8cf;color:#77716a;font-size:10px;text-align:center}@media(max-width:620px){.page{margin:0;padding:24px 18px}.header,.addresses{display:block}.meta{margin-top:22px;text-align:left}.address+.address{margin-top:20px}th:nth-child(3),td:nth-child(3){display:none}.payment-grid{grid-template-columns:1fr}}@media print{body{background:#fff}.page{margin:0;width:100%;padding:20px}}
  </style>
</head>
<body><main class="page">
  <header class="header">
    <div class="brand"><img src="${escapeHtml(logoUrl)}" alt="Je mange Africain"><div><h1>${escapeHtml(company.name)}</h1>${companyDetails}</div></div>
    <div class="meta"><strong>${escapeHtml(isFr ? "FACTURE" : "INVOICE")}</strong><p>N° ${escapeHtml(invoiceNumber)}</p><p>${escapeHtml(isFr ? "Date d'émission" : "Issue date")}: ${escapeHtml(invoiceDate)}</p><p>${escapeHtml(isFr ? "Devise" : "Currency")}: ${escapeHtml(currencyCode)}</p></div>
  </header>
  <section class="addresses">
    <div class="address"><div class="label">${escapeHtml(isFr ? "Émetteur" : "Seller")}</div><strong>${escapeHtml(company.name)}</strong>${companyDetails}</div>
    <div class="address"><div class="label">${escapeHtml(isFr ? "Facturé et livré à" : "Billed and delivered to")}</div>${deliveryDetails || `<div>${escapeHtml(isFr ? "Coordonnées associées à la commande" : "Details linked to the order")}</div>`}</div>
  </section>
  <table><thead><tr><th>${escapeHtml(isFr ? "Désignation" : "Item")}</th><th class="number">${escapeHtml(isFr ? "Qté" : "Qty")}</th><th class="number">${escapeHtml(isFr ? "Prix unitaire" : "Unit price")}</th><th class="number">${escapeHtml(isFr ? "Montant" : "Amount")}</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="summary">${summaryRows}<div class="summary-row grand-total"><span>${escapeHtml(isFr ? "Total TTC" : "Total incl. tax")}</span><strong>${escapeHtml(formatMoney(order.total))}</strong></div></section>
  <section class="payment"><strong>${escapeHtml(isFr ? "Paiement et livraison" : "Payment and delivery")}</strong><div class="payment-grid"><div>${escapeHtml(isFr ? "Statut" : "Status")}: ${escapeHtml(paymentStatusLabel)}</div><div>${escapeHtml(isFr ? "Mode" : "Method")}: ${escapeHtml(paymentMethod || (isFr ? "Enregistré avec la commande" : "Recorded with the order"))}</div>${reference ? `<div>${escapeHtml(isFr ? "Référence du paiement" : "Payment reference")}: ${escapeHtml(reference)}</div>` : ""}${deliveryServiceLabel ? `<div>${escapeHtml(isFr ? "Service" : "Service")}: ${escapeHtml(deliveryServiceLabel)}</div>` : ""}</div></section>
  <footer class="footer">${escapeHtml(isFr ? "Merci pour votre confiance. Conservez cette facture comme justificatif d'achat." : "Thank you for your trust. Keep this invoice as proof of purchase.")}</footer>
</main></body></html>`;
}

export function downloadOrderInvoice(order: Record<string, any>, locale: "fr" | "en") {
  const html = buildOrderInvoiceHtml(order, locale, {
    baseUrl: window.location.origin,
    company: {
      name: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Je mange Africain",
      address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
      registration: process.env.NEXT_PUBLIC_COMPANY_REGISTRATION || "",
      vat: process.env.NEXT_PUBLIC_COMPANY_VAT_NUMBER || "",
      email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com",
      phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
    },
  });
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(order.number || "facture").replace(/[^a-zA-Z0-9_-]/g, "-")}.html`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareRecipe(title: string, recipeId: string) {
  const url = `${window.location.origin}/?view=recipe-config&recipeId=${encodeURIComponent(recipeId)}`;
  if (navigator.share) {
    await navigator.share({ title, text: title, url });
    return;
  }
  await navigator.clipboard.writeText(url);
}

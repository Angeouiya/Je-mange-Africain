"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  Boxes,
  Building2,
  CheckCircle2,
  ChefHat,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Globe2,
  HeartHandshake,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageOpen,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  ShoppingBag,
  Snowflake,
  Truck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStore, type ContactReason } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { useFetch } from "@/lib/use-fetch";
import { requestPrivacyPreferences } from "@/lib/privacy-consent";

interface ContactFormState {
  name: string;
  email: string;
  reason: ContactReason;
  orderNumber: string;
  subject: string;
  message: string;
}

type PublicPlatformConfiguration = {
  support: { email: string; phone: string; hours: { fr: string; en: string }; responseHours: number };
  location: { city: string; country: string };
};

type SupportTopic = "all" | Exclude<ContactReason, "other">;

interface SupportFaq {
  id: string;
  topic: Exclude<ContactReason, "other">;
  questionFr: string;
  questionEn: string;
  answerFr: string;
  answerEn: string;
  keywords: string;
}

const CONTACT_DRAFT_KEY = "jma-contact-draft-v2";
const CONTACT_REASONS: ContactReason[] = ["order", "delivery", "product", "recipe", "wholesale", "other"];
const SUPPORT_TOPICS: SupportTopic[] = ["all", "order", "delivery", "product", "recipe", "wholesale"];

const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: "recipe-configurator",
    topic: "recipe",
    questionFr: "Comment fonctionne le configurateur de recettes ?",
    questionEn: "How does the recipe configurator work?",
    answerFr: "Choisissez une recette, indiquez le nombre de personnes puis retirez ou remplacez les ingrédients. Les quantités, conditionnements, restes estimés et le coût par personne sont recalculés avant l'ajout au panier.",
    answerEn: "Choose a recipe, set the number of people, then remove or replace ingredients. Quantities, pack sizes, estimated leftovers and cost per person are recalculated before the basket is created.",
    keywords: "recette personnes quantité ingrédient remplacer panier recipe servings ingredient replace basket",
  },
  {
    id: "delivery-times",
    topic: "delivery",
    questionFr: "Quels sont les délais et services de livraison ?",
    questionEn: "What delivery services and lead times are available?",
    answerFr: "Les transporteurs, tarifs et créneaux sont calculés selon le pays, le code postal, le poids et la classe thermique du panier. Vous comparez les options disponibles avant le paiement.",
    answerEn: "Carriers, prices and delivery windows are calculated from the country, postcode, basket weight and thermal class. You compare all available options before payment.",
    keywords: "délai transporteur tarif créneau pays postcode carrier delivery shipping time",
  },
  {
    id: "cold-chain",
    topic: "delivery",
    questionFr: "Comment la chaîne du froid est-elle protégée ?",
    questionEn: "How is the cold chain protected?",
    answerFr: "Chaque produit est classé ambiant, réfrigéré ou surgelé. La commande est séparée en colis compatibles et seules les options de transport capables de respecter la température sont proposées.",
    answerEn: "Every product is classified as ambient, chilled or frozen. The order is split into compatible parcels and only services able to preserve the required temperature are offered.",
    keywords: "frais surgelé température froid colis chilled frozen temperature cold chain",
  },
  {
    id: "guest-order",
    topic: "order",
    questionFr: "Puis-je commander sans compte ?",
    questionEn: "Can I order without an account?",
    answerFr: "Vous pouvez explorer le catalogue et composer votre panier librement. La connexion devient obligatoire avant le paiement afin de sécuriser l'adresse, la facture et le suivi de livraison.",
    answerEn: "You can browse the catalogue and build your basket freely. Sign-in is required before payment to secure the address, invoice and delivery tracking.",
    keywords: "compte connexion invité paiement adresse facture account guest sign in checkout",
  },
  {
    id: "payment-methods",
    topic: "order",
    questionFr: "Quels moyens de paiement acceptez-vous ?",
    questionEn: "Which payment methods do you accept?",
    answerFr: "Le paiement par carte est sécurisé par Stripe. Les moyens accélérés compatibles avec votre appareil et votre pays apparaissent directement à l'étape de paiement lorsqu'ils sont disponibles.",
    answerEn: "Card payments are secured by Stripe. Accelerated methods supported by your device and country appear at checkout whenever they are available.",
    keywords: "carte stripe paiement sécurisé card payment secure checkout",
  },
  {
    id: "change-order",
    topic: "order",
    questionFr: "Puis-je modifier ou annuler une commande ?",
    questionEn: "Can I change or cancel an order?",
    answerFr: "Contactez l'assistance au plus vite avec le numéro de commande. Une modification reste possible tant que la préparation logistique n'a pas commencé; l'état affiché dans le suivi fait foi.",
    answerEn: "Contact support as soon as possible with the order number. A change remains possible until fulfilment begins; the status shown in tracking is authoritative.",
    keywords: "modifier annuler commande préparation cancel change order fulfilment",
  },
  {
    id: "refund",
    topic: "product",
    questionFr: "Comment signaler un produit manquant ou abîmé ?",
    questionEn: "How do I report a missing or damaged product?",
    answerFr: "Ouvrez une demande avec le numéro de commande, le produit concerné et les justificatifs utiles. Après contrôle, le remplacement, l'avoir ou le remboursement applicable est confirmé par e-mail.",
    answerEn: "Open a request with the order number, affected product and useful evidence. After review, the applicable replacement, credit or refund is confirmed by email.",
    keywords: "remboursement manquant abîmé produit photo refund missing damaged product",
  },
  {
    id: "product-information",
    topic: "product",
    questionFr: "Où trouver les allergènes et conseils de conservation ?",
    questionEn: "Where can I find allergens and storage guidance?",
    answerFr: "La fiche de chaque produit présente ses ingrédients, allergènes, poids, origine, classe thermique et consignes de conservation. En cas de doute, utilisez le formulaire avec le nom exact du produit.",
    answerEn: "Each product page shows ingredients, allergens, weight, origin, thermal class and storage guidance. If in doubt, use the form with the exact product name.",
    keywords: "allergène conservation ingrédient origine poids allergen storage ingredient origin weight",
  },
  {
    id: "wholesale-quote",
    topic: "wholesale",
    questionFr: "Comment obtenir un prix pour plusieurs cartons ?",
    questionEn: "How do I get pricing for several cases?",
    answerFr: "Le marché de gros affiche les paliers de quantité et le prix dégressif. Composez votre bordereau puis envoyez une demande de devis pour confirmer volumes, disponibilité et logistique.",
    answerEn: "The wholesale market shows quantity tiers and decreasing unit prices. Build your schedule and send a quote request to confirm volumes, availability and logistics.",
    keywords: "gros carton lot palette devis prix volume wholesale case pallet quote tier",
  },
];

function createEmptyContactForm(reason: ContactReason = "order"): ContactFormState {
  return { name: "", email: "", reason, orderNumber: "", subject: "", message: "" };
}

function normaliseSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function reasonPresentation(reason: ContactReason | SupportTopic, locale: "fr" | "en") {
  const isFr = locale === "fr";
  const definitions: Record<ContactReason | "all", { label: string; description: string; icon: LucideIcon }> = {
    all: { label: isFr ? "Toutes" : "All", description: isFr ? "9 réponses" : "9 answers", icon: BookOpenText },
    order: { label: isFr ? "Commande" : "Order", description: isFr ? "Paiement et suivi" : "Payment and tracking", icon: ShoppingBag },
    delivery: { label: isFr ? "Livraison" : "Delivery", description: isFr ? "Délais et froid" : "Timing and cold chain", icon: Truck },
    product: { label: isFr ? "Produit" : "Product", description: isFr ? "Qualité et retour" : "Quality and returns", icon: PackageOpen },
    recipe: { label: isFr ? "Recette" : "Recipe", description: isFr ? "Calcul et panier" : "Scaling and basket", icon: ChefHat },
    wholesale: { label: isFr ? "Marché de gros" : "Wholesale", description: isFr ? "Lots et devis" : "Cases and quotes", icon: Boxes },
    other: { label: isFr ? "Autre demande" : "Other request", description: isFr ? "Question générale" : "General question", icon: MessageSquare },
  };
  return definitions[reason];
}

export function InfoView() {
  const locale = useStore((state) => state.locale);
  const params = useStore((state) => state.params);
  const navigate = useStore((state) => state.navigate);
  const customer = useStore((state) => state.customer);
  const t = dict[locale];
  const page = params.infoPage || "about";
  const isLegalPage = ["cgv", "privacy", "cookies", "delivery"].includes(page);
  const { data: platformData } = useFetch<{ configuration: PublicPlatformConfiguration }>("/api/platform", []);
  const responseHours = platformData?.configuration.support.responseHours || 48;

  const legalContent = {
    cgv: <LegalDocument kind="terms" locale={locale} />,
    privacy: <LegalDocument kind="privacy" locale={locale} />,
    cookies: <LegalDocument kind="cookies" locale={locale} />,
    delivery: <LegalDocument kind="delivery" locale={locale} />,
  } as const;

  if (isLegalPage) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-7 md:px-7 md:py-10 lg:px-8">
        <PageBackButton fallbackView="home" className="mb-3" />
        {legalContent[page as keyof typeof legalContent]}
        {page === "cookies" ? <div className="mt-5 flex items-center justify-between gap-4 border-y border-burgundy/12 bg-[#FFF8F4] px-4 py-4"><div className="min-w-0"><p className="text-xs font-black text-charcoal">{locale === "fr" ? "Vos préférences actuelles" : "Your current preferences"}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{locale === "fr" ? "Réouvrez le centre pour modifier chaque finalité." : "Reopen the centre to change each purpose."}</p></div><Button type="button" onClick={requestPrivacyPreferences} aria-label={locale === "fr" ? "Gérer mes choix" : "Manage choices"} className="shrink-0 bg-burgundy text-white hover:bg-terre"><SlidersHorizontal className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">{locale === "fr" ? "Gérer mes choix" : "Manage choices"}</span><span className="sm:hidden">{locale === "fr" ? "Gérer" : "Manage"}</span></Button></div> : null}
      </div>
    );
  }

  const definitions = {
    about: {
      eyebrow: locale === "fr" ? "Notre maison" : "Our company",
      title: locale === "fr" ? "Je mange Africain, de la source à votre table" : "Je mange Africain, from source to table",
      description: locale === "fr" ? "Une épicerie digitale française qui relie produits authentiques, recettes et logistique européenne." : "A French digital grocer connecting authentic products, recipes and controlled European logistics.",
      icon: Building2,
    },
    help: {
      eyebrow: locale === "fr" ? "Assistance guidée" : "Guided support",
      title: locale === "fr" ? "Comment pouvons-nous vous aider ?" : "How can we help?",
      description: locale === "fr" ? "Trouvez une réponse ou transmettez un dossier déjà contextualisé à notre équipe." : "Find an answer or send our team a request that already includes the right context.",
      icon: LifeBuoy,
    },
    contact: {
      eyebrow: locale === "fr" ? "Dossier d'assistance" : "Support request",
      title: locale === "fr" ? "Parlez-nous de votre demande" : "Tell us what you need",
      description: locale === "fr" ? "Un parcours guidé pour transmettre les bonnes informations et accélérer la prise en charge." : "A guided flow that gathers the right information and speeds up handling.",
      icon: MessageSquare,
    },
  } as const;
  const definition = definitions[page as keyof typeof definitions] || definitions.about;
  const PageIcon = definition.icon;
  const tabs = [
    { id: "about" as const, label: locale === "fr" ? "La maison" : "Our company", icon: Building2 },
    { id: "help" as const, label: locale === "fr" ? "Aide" : "Help", icon: CircleHelp },
    { id: "contact" as const, label: locale === "fr" ? "Contact" : "Contact", icon: MessageSquare },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-7 md:py-8 lg:px-8" data-testid="information-workspace">
      <div className="flex items-center justify-between gap-3">
        <PageBackButton fallbackView="home" />
        <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-burgundy/10 bg-white px-2.5 text-[10px] font-extrabold text-burgundy shadow-[0_8px_24px_-22px_rgba(90,38,50,0.65)]"><ShieldCheck className="h-3.5 w-3.5" />{locale === "fr" ? "Assistance sécurisée" : "Secure support"}</span>
      </div>

      <nav className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-burgundy/10 bg-[#FFFCFA] p-1" aria-label={locale === "fr" ? "Information et assistance" : "Information and support"}>
        {tabs.map((tab) => {
          const active = page === tab.id;
          return <button key={tab.id} type="button" onClick={() => navigate("info", { infoPage: tab.id })} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-[11px] font-extrabold transition ${active ? "border border-terre/15 bg-white text-terre shadow-[0_9px_24px_-20px_rgba(185,71,43,0.8)]" : "text-muted-foreground hover:bg-white/70 hover:text-charcoal"}`}><tab.icon className={`h-4 w-4 ${active ? "stroke-[2.5]" : ""}`} /><span className="truncate">{tab.label}</span>{active ? <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-gold" aria-hidden="true" /> : null}</button>;
        })}
      </nav>

      <header className="grid gap-4 border-b border-charcoal/8 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:py-7">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-md border border-terre/10 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.06))] text-terre"><PageIcon className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="jma-eyebrow">{definition.eyebrow}</p><h1 className="mt-1 font-display text-[clamp(1.65rem,4vw,2.45rem)] font-semibold leading-[1.06] text-charcoal">{definition.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{definition.description}</p></div>
        </div>
        <div className="hidden items-center gap-3 md:flex"><span className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-burgundy"><Clock3 className="h-4 w-4" /></span><span><span className="block text-[9px] font-black uppercase text-muted-foreground">{locale === "fr" ? "Délai indicatif" : "Typical response"}</span><span className="mt-0.5 block text-xs font-black text-charcoal">{locale === "fr" ? `Réponse sous ${responseHours} h` : `Reply within ${responseHours} hrs`}</span></span></div>
      </header>

      {page === "about" ? <AboutStory locale={locale} promise={t.promise} onCatalog={() => navigate("catalog")} onRecipes={() => navigate("recipes")} /> : null}
      {page === "help" ? <HelpCenter locale={locale} isAuthenticated={Boolean(customer)} onTrackOrders={() => navigate(customer ? "orders" : "account", customer ? undefined : { returnView: "orders" })} onContact={(contactReason) => navigate("info", { infoPage: "contact", contactReason })} /> : null}
      {page === "contact" ? <ContactForm locale={locale} initialReason={params.contactReason} configuration={platformData?.configuration} /> : null}
    </div>
  );
}

function HelpCenter({ locale, isAuthenticated, onTrackOrders, onContact }: { locale: "fr" | "en"; isAuthenticated: boolean; onTrackOrders: () => void; onContact: (reason: ContactReason) => void }) {
  const isFr = locale === "fr";
  const [topic, setTopic] = useState<SupportTopic>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalisedQuery = normaliseSearch(deferredQuery);
  const filteredFaqs = useMemo(() => SUPPORT_FAQS.filter((faq) => {
    if (topic !== "all" && faq.topic !== topic) return false;
    if (!normalisedQuery) return true;
    const haystack = normaliseSearch(`${faq.questionFr} ${faq.questionEn} ${faq.answerFr} ${faq.answerEn} ${faq.keywords}`);
    return haystack.includes(normalisedQuery);
  }), [normalisedQuery, topic]);
  const contactReason: ContactReason = topic === "all" ? "order" : topic;

  return (
    <div className="py-5 md:py-7" data-testid="support-command-center">
      <section className="grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 bg-[#FFFCFA] py-3.5 text-center" aria-label={isFr ? "Engagements de l'assistance" : "Support commitments"}>
        <SupportMetric icon={Clock3} value="< 48 h" label={isFr ? "Réponse écrite" : "Written reply"} />
        <SupportMetric icon={Globe2} value="FR / EN" label={isFr ? "Deux langues" : "Two languages"} />
        <SupportMetric icon={Snowflake} value="3" label={isFr ? "Classes thermiques" : "Thermal classes"} />
      </section>

      <section className="mt-6" aria-labelledby="support-topic-title">
        <div className="flex items-end justify-between gap-3"><div><p className="jma-eyebrow">{isFr ? "Accès direct" : "Direct access"}</p><h2 id="support-topic-title" className="mt-1 text-lg font-black text-charcoal">{isFr ? "Choisissez votre sujet" : "Choose your topic"}</h2></div><span className="hidden text-[10px] font-bold text-muted-foreground sm:block">{isFr ? "Une réponse ciblée en un geste" : "A focused answer in one tap"}</span></div>
        <div className="scroll-pretty -mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0" role="group" aria-label={isFr ? "Sujets d'aide" : "Help topics"}>
          {SUPPORT_TOPICS.map((item) => {
            const presentation = reasonPresentation(item, locale);
            const active = topic === item;
            return <button key={item} type="button" onClick={() => setTopic(item)} aria-pressed={active} data-testid={`support-topic-${item}`} className={`group min-h-[5.25rem] min-w-[8.25rem] snap-start rounded-md border p-3 text-left transition md:min-w-0 ${active ? "border-terre/25 bg-[linear-gradient(145deg,rgba(185,71,43,0.1),rgba(242,169,0,0.05))] shadow-[0_14px_30px_-26px_rgba(185,71,43,0.9)]" : "border-charcoal/8 bg-white hover:border-terre/20 hover:bg-[#FFFCFA]"}`}><span className={`grid h-8 w-8 place-items-center rounded-md ${active ? "bg-terre text-white" : "bg-terre/8 text-terre"}`}><presentation.icon className="h-4 w-4" /></span><span className="mt-2 block text-[11px] font-black text-charcoal">{presentation.label}</span><span className="mt-0.5 block text-[9px] leading-3.5 text-muted-foreground">{presentation.description}</span></button>;
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <section className="min-w-0" aria-labelledby="support-answers-title">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
            <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 rounded-md border-charcoal/10 bg-white pl-10 pr-11 text-sm shadow-[0_10px_28px_-26px_rgba(90,38,50,0.6)]" placeholder={isFr ? "Rechercher: paiement, froid, remboursement..." : "Search: payment, cold chain, refund..."} aria-label={isFr ? "Rechercher dans le centre d'aide" : "Search the help centre"} />
            {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-terre/5 hover:text-terre" aria-label={isFr ? "Effacer la recherche" : "Clear search"}><X className="h-4 w-4" /></button> : null}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3"><div><p className="jma-eyebrow">{isFr ? "Base de connaissances" : "Knowledge base"}</p><h2 id="support-answers-title" className="mt-1 text-lg font-black text-charcoal">{isFr ? "Réponses utiles" : "Useful answers"}</h2></div><span className="rounded-md bg-burgundy/[0.07] px-2 py-1 text-[10px] font-black text-burgundy" aria-live="polite">{filteredFaqs.length} {isFr ? "réponse(s)" : "answer(s)"}</span></div>
          {filteredFaqs.length ? (
            <Accordion type="single" collapsible className="mt-2 overflow-hidden rounded-md border border-charcoal/8 bg-white" data-testid="support-answer-list">
              {filteredFaqs.map((faq) => <AccordionItem key={faq.id} value={faq.id} className="border-charcoal/8 px-3 sm:px-4"><AccordionTrigger className="min-h-14 py-3 text-left text-[13px] font-extrabold leading-5 text-charcoal hover:text-terre hover:no-underline">{isFr ? faq.questionFr : faq.questionEn}</AccordionTrigger><AccordionContent className="border-t border-charcoal/6 pb-4 pt-3 text-[13px] leading-6 text-muted-foreground">{isFr ? faq.answerFr : faq.answerEn}</AccordionContent></AccordionItem>)}
            </Accordion>
          ) : (
            <div className="mt-3 border-y border-gold/30 bg-gold/[0.055] px-4 py-6 text-center" role="status"><Search className="mx-auto h-5 w-5 text-burgundy" /><p className="mt-2 text-sm font-black text-charcoal">{isFr ? "Aucune réponse exacte" : "No exact answer"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Effacez la recherche ou transmettez directement votre demande." : "Clear the search or send your request directly."}</p><button type="button" onClick={() => { setQuery(""); setTopic("all"); }} className="mt-3 min-h-9 text-xs font-black text-terre hover:underline">{isFr ? "Afficher toutes les réponses" : "Show all answers"}</button></div>
          )}
        </section>

        <aside className="self-start rounded-md border border-burgundy/12 bg-[linear-gradient(160deg,rgba(255,255,255,1),rgba(185,71,43,0.055))] p-4 shadow-[0_20px_44px_-38px_rgba(90,38,50,0.58)] lg:sticky lg:top-24" aria-labelledby="support-actions-title">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-burgundy text-white"><ClipboardCheck className="h-5 w-5" /></span>
          <p className="mt-4 jma-eyebrow">{isFr ? "Résolution" : "Resolution"}</p>
          <h2 id="support-actions-title" className="mt-1 text-base font-black text-charcoal">{isFr ? "Passez directement à l'action" : "Move straight to action"}</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{isFr ? "Consultez le suivi autonome ou envoyez un dossier au bon service." : "Use self-service tracking or send a request to the right team."}</p>
          <div className="mt-4 space-y-2">
            <Button type="button" variant="outline" onClick={onTrackOrders} className="h-auto min-h-11 w-full justify-between border-charcoal/10 bg-white px-3 text-left text-charcoal hover:border-terre/25 hover:bg-white"><span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-terre" /><span><span className="block text-xs font-black">{isFr ? "Suivre une commande" : "Track an order"}</span><span className="block text-[9px] font-medium text-muted-foreground">{isAuthenticated ? (isFr ? "Historique et colis" : "History and parcels") : (isFr ? "Connexion requise" : "Sign-in required")}</span></span></span><ArrowRight className="h-3.5 w-3.5 text-terre" /></Button>
            <Button type="button" onClick={() => onContact(contactReason)} className="h-auto min-h-11 w-full justify-between bg-terre px-3 text-left text-white hover:bg-terre-dark"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /><span><span className="block text-xs font-black">{isFr ? "Ouvrir le formulaire" : "Open the form"}</span><span className="block text-[9px] font-medium text-white/80">{reasonPresentation(contactReason, locale).label}</span></span></span><ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="mt-4 border-t border-burgundy/10 pt-3"><p className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-burgundy" />{isFr ? "Données utilisées uniquement pour traiter la demande" : "Data used only to handle the request"}</p></div>
        </aside>
      </div>
    </div>
  );
}

function ContactForm({ locale, initialReason, configuration }: { locale: "fr" | "en"; initialReason?: ContactReason; configuration?: PublicPlatformConfiguration }) {
  const isFr = locale === "fr";
  const customer = useStore((state) => state.customer);
  const defaultReason = initialReason ?? "order";
  const initialForm = createEmptyContactForm(defaultReason);
  const [form, setForm] = useState<ContactFormState>(() => initialForm);
  const formRef = useRef<ContactFormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const companyPhone = configuration?.support.phone || process.env.NEXT_PUBLIC_COMPANY_PHONE || "";
  const supportEmail = configuration?.support.email || process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com";
  const supportHours = configuration?.support.hours[locale] || (isFr ? "Du lundi au vendredi, de 9 h à 18 h" : "Monday to Friday, 9am to 6pm");
  const supportResponseHours = configuration?.support.responseHours || 48;
  const businessLocation = configuration ? `${configuration.location.city}, ${configuration.location.country}` : "Paris, France";
  const orderRelevant = ["order", "delivery", "product"].includes(form.reason);
  const readyChecks = [form.name.trim().length >= 2, /^\S+@\S+\.\S+$/.test(form.email), form.subject.trim().length >= 3, form.message.trim().length >= 10];
  const readyCount = readyChecks.filter(Boolean).length;
  const readiness = Math.round((readyCount / readyChecks.length) * 100);

  const updateField = (field: keyof ContactFormState, value: string) => {
    const next = { ...formRef.current, [field]: value } as ContactFormState;
    formRef.current = next;
    setForm(next);
    persistContactDraft(next);
    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
      setReference("");
    }
  };

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(CONTACT_DRAFT_KEY);
      const parsed = saved ? JSON.parse(saved) as Partial<ContactFormState> : {};
      const restored = { ...createEmptyContactForm(defaultReason), ...parsed, reason: initialReason ?? parsed.reason ?? "order" };
      formRef.current = restored;
      setForm(restored);
    } catch {
      window.sessionStorage.removeItem(CONTACT_DRAFT_KEY);
    }
  }, [defaultReason, initialReason]);

  useEffect(() => {
    if (!customer) return;
    const current = formRef.current;
    const next = { ...current, name: current.name || `${customer.firstName} ${customer.lastName}`.trim(), email: current.email || customer.email };
    formRef.current = next;
    setForm(next);
    persistContactDraft(next);
  }, [customer]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("busy");
    setMessage("");
    const reasonLabel = reasonPresentation(form.reason, locale).label;
    const orderContext = form.orderNumber.trim() ? `${isFr ? "Commande" : "Order"}: ${form.orderNumber.trim()}` : "";
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        subject: `[${reasonLabel}] ${form.subject}${orderContext ? ` · ${orderContext}` : ""}`,
        message: orderContext ? `${orderContext}\n\n${form.message}` : form.message,
      }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setStatus("error");
      setMessage(payload.error || (isFr ? "Votre message n'a pas pu être envoyé." : "Your message could not be sent."));
      return;
    }
    setStatus("success");
    setReference(payload.reference || "JMA");
    window.sessionStorage.removeItem(CONTACT_DRAFT_KEY);
  };

  const startNewRequest = () => {
    const reset = { ...createEmptyContactForm(form.reason), name: customer ? `${customer.firstName} ${customer.lastName}`.trim() : "", email: customer?.email || "" };
    formRef.current = reset;
    setForm(reset);
    setStatus("idle");
    setMessage("");
    setReference("");
  };

  const statusMessage = status === "success"
    ? (isFr ? `Demande ${reference} enregistrée. Une confirmation a été préparée et notre équipe vous répondra sous ${supportResponseHours} h.` : `Request ${reference} recorded. A confirmation has been prepared and our team will reply within ${supportResponseHours} hours.`)
    : message;

  return (
    <div className="grid gap-7 py-5 md:py-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-9" data-testid="contact-support-studio">
      <form onSubmit={submit} className="min-w-0 space-y-6 pb-4 sm:pb-0">
        <fieldset className="min-w-0">
          <legend className="text-sm font-black text-charcoal">{isFr ? "1. Quel service doit vous répondre ?" : "1. Which team should answer?"}</legend>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Le motif structure automatiquement votre dossier." : "The reason automatically structures your request."}</p>
          <div className="scroll-pretty -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0" data-testid="contact-reason-selector">
            {CONTACT_REASONS.map((reason) => {
              const presentation = reasonPresentation(reason, locale);
              const active = form.reason === reason;
              return <button key={reason} type="button" onClick={() => updateField("reason", reason)} aria-pressed={active} className={`min-h-[4.25rem] min-w-[8.6rem] rounded-md border p-2.5 text-left transition lg:min-w-0 ${active ? "border-terre/30 bg-terre/[0.07] shadow-[0_12px_26px_-24px_rgba(185,71,43,0.9)]" : "border-charcoal/8 bg-white hover:border-terre/20"}`}><span className="flex items-center gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${active ? "bg-terre text-white" : "bg-terre/8 text-terre"}`}><presentation.icon className="h-4 w-4" /></span><span><span className="block text-[11px] font-black text-charcoal">{presentation.label}</span><span className="mt-0.5 block text-[9px] leading-3.5 text-muted-foreground">{presentation.description}</span></span></span></button>;
            })}
          </div>
        </fieldset>

        <section className="border-t border-charcoal/8 pt-5" aria-labelledby="contact-details-title">
          <div><p className="jma-eyebrow">{isFr ? "Coordonnées" : "Contact details"}</p><h2 id="contact-details-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "2. Identifiez votre dossier" : "2. Identify your request"}</h2></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ContactField id="contact-name" label={isFr ? "Nom complet" : "Full name"} value={form.name} onChange={(value) => updateField("name", value)} autoComplete="name" required />
            <ContactField id="contact-email" label="E-mail" type="email" value={form.email} onChange={(value) => updateField("email", value)} autoComplete="email" required />
          </div>
          {orderRelevant ? <div className="mt-3"><ContactField id="contact-order" label={isFr ? "N° de commande (recommandé)" : "Order number (recommended)"} value={form.orderNumber} onChange={(value) => updateField("orderNumber", value)} placeholder="JMA-..." hint={isFr ? "Visible dans Mon espace > Commandes et sur votre facture." : "Shown in My account > Orders and on your invoice."} /></div> : null}
        </section>

        <section className="border-t border-charcoal/8 pt-5" aria-labelledby="contact-message-title">
          <div><p className="jma-eyebrow">{isFr ? "Contexte utile" : "Useful context"}</p><h2 id="contact-message-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "3. Décrivez le résultat attendu" : "3. Describe the expected outcome"}</h2></div>
          <div className="mt-3"><ContactField id="contact-subject" label={isFr ? "Objet" : "Subject"} value={form.subject} onChange={(value) => updateField("subject", value)} placeholder={isFr ? "Ex. Vérifier la température de mon colis" : "E.g. Check my parcel temperature"} required /></div>
          <div className="mt-3"><Label htmlFor="contact-message" className="mb-1.5 block text-xs font-bold text-charcoal">Message</Label><Textarea id="contact-message" name="message" rows={7} minLength={10} maxLength={4500} value={form.message} onChange={(event) => updateField("message", event.target.value)} required className="min-h-36 resize-y rounded-md border-charcoal/10 bg-white text-sm leading-6 focus:border-terre" placeholder={isFr ? "Indiquez les faits, le produit concerné et la solution souhaitée..." : "Share the facts, affected product and preferred solution..."} /><div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] text-muted-foreground"><span>{isFr ? "Ne communiquez jamais vos données bancaires." : "Never share your bank details."}</span><span className="shrink-0 tabular-nums">{form.message.length} / 4500</span></div></div>
        </section>

        {statusMessage ? <div role={status === "error" ? "alert" : "status"} className={`flex gap-3 rounded-md border p-3.5 text-xs leading-5 ${status === "success" ? "border-burgundy/20 bg-burgundy/[0.055] text-burgundy" : "border-destructive/25 bg-destructive/[0.06] text-destructive"}`}>{status === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />}<span>{statusMessage}</span></div> : null}
        <div className="rounded-md border border-white/70 bg-white p-1.5 shadow-[0_18px_42px_-26px_rgba(90,38,50,0.6)] sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button type={status === "success" ? "button" : "submit"} onClick={status === "success" ? startNewRequest : undefined} disabled={status === "busy"} className="min-h-12 w-full justify-between bg-terre px-4 text-white shadow-[0_16px_34px_-24px_rgba(185,71,43,0.9)] hover:bg-terre-dark sm:w-auto sm:min-w-64"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />{status === "busy" ? (isFr ? "Envoi du dossier..." : "Sending request...") : status === "success" ? (isFr ? "Nouvelle demande" : "New request") : (isFr ? "Envoyer la demande" : "Send request")}</span><ArrowRight className="h-4 w-4" /></Button>
        </div>
      </form>

      <aside className="self-start border-t border-charcoal/8 pt-5 lg:sticky lg:top-24 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-labelledby="contact-readiness-title">
        <div className="rounded-md border border-burgundy/12 bg-[#FFFCFA] p-4">
          <div className="flex items-center justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-burgundy text-white"><ClipboardCheck className="h-5 w-5" /></span><span className="text-sm font-black tabular-nums text-burgundy">{readiness}%</span></div>
          <p className="mt-4 jma-eyebrow">{isFr ? "Qualité du dossier" : "Request quality"}</p>
          <h2 id="contact-readiness-title" className="mt-1 text-base font-black text-charcoal">{readiness === 100 ? (isFr ? "Prêt à envoyer" : "Ready to send") : (isFr ? `${readyCount} information(s) sur 4` : `${readyCount} of 4 details`)}</h2>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-burgundy/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness} aria-label={isFr ? "Préparation de la demande" : "Request readiness"}><div className="h-full rounded-full bg-[linear-gradient(90deg,#B9472B,#F2A900)] transition-[width]" style={{ width: `${readiness}%` }} /></div>
          <div className="mt-5 space-y-3 border-t border-burgundy/10 pt-4">
            {[
              [isFr ? "Référence immédiate" : "Instant reference", isFr ? "Après l'envoi" : "After submission"],
              [isFr ? "Lecture par le bon service" : "Right-team review", isFr ? "Selon le motif" : "Based on reason"],
              [isFr ? "Réponse par e-mail" : "Reply by email", isFr ? `Sous ${supportResponseHours} h` : `Within ${supportResponseHours} hrs`],
            ].map(([title, detail], index) => <div key={title} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gold/18 text-[10px] font-black text-burgundy">{index + 1}</span><span><span className="block text-[11px] font-black text-charcoal">{title}</span><span className="mt-0.5 block text-[9px] text-muted-foreground">{detail}</span></span></div>)}
          </div>
        </div>
        <div className="mt-4 space-y-2 text-[11px] text-muted-foreground">
          {companyPhone ? <a href={`tel:${companyPhone.replace(/\s/g, "")}`} className="flex min-h-10 items-center gap-2 rounded-md px-1 hover:text-terre"><Phone className="h-4 w-4 shrink-0 text-terre" />{companyPhone}</a> : null}
          <a href={`mailto:${supportEmail}`} className="flex min-h-10 min-w-0 items-center gap-2 rounded-md px-1 hover:text-terre"><Mail className="h-4 w-4 shrink-0 text-terre" /><span className="min-w-0 break-all">{supportEmail}</span></a>
          <div className="flex min-h-10 items-start gap-2 px-1 py-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{supportHours}</span></div>
          <div className="flex min-h-10 items-center gap-2 px-1"><MapPin className="h-4 w-4 shrink-0 text-terre" />{businessLocation}</div>
        </div>
      </aside>
    </div>
  );
}

function ContactField({ id, label, value, onChange, type = "text", autoComplete, required, placeholder, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; required?: boolean; placeholder?: string; hint?: string }) {
  return <div><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><Input id={id} name={id.replace("contact-", "")} type={type} autoComplete={autoComplete} maxLength={type === "email" ? 254 : 120} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="h-11 rounded-md border-charcoal/10 bg-white focus:border-terre" />{hint ? <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{hint}</p> : null}</div>;
}

function persistContactDraft(form: ContactFormState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(form));
}

function AboutStory({ locale, promise, onCatalog, onRecipes }: { locale: "fr" | "en"; promise: string; onCatalog: () => void; onRecipes: () => void }) {
  const isFr = locale === "fr";
  const principles = isFr
    ? [
        { icon: Globe2, title: "Une cuisine sans frontières", text: "Des références d'Afrique de l'Ouest et centrale pensées pour les foyers européens." },
        { icon: PackageCheck, title: "Une offre maîtrisée", text: "Je mange Africain sélectionne, stocke, commercialise et organise chaque livraison." },
        { icon: HeartHandshake, title: "La transmission au centre", text: "Les recettes relient chaque ingrédient à son usage, son origine et son histoire culinaire." },
      ]
    : [
        { icon: Globe2, title: "Food without borders", text: "West and Central African essentials curated for European households." },
        { icon: PackageCheck, title: "A controlled offer", text: "Je mange Africain selects, stores, sells and organises every delivery." },
        { icon: HeartHandshake, title: "Passing culture forward", text: "Recipes connect each ingredient with its use, origin and culinary story." },
      ];

  return (
    <div className="grid gap-7 py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:gap-8 lg:py-8">
      <div>
        <figure className="relative aspect-[16/10] overflow-hidden rounded-md">
          <Image src="/hero-feast-v2.webp" alt={isFr ? "Table de plats africains" : "Table of African dishes"} fill sizes="(max-width: 1024px) 100vw, 720px" className="object-cover" />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(90,38,50,0.02),rgba(90,38,50,0.78))]" />
          <figcaption className="absolute inset-x-0 bottom-0 p-5 font-display text-2xl font-semibold leading-tight text-white sm:p-7 sm:text-3xl">{promise}</figcaption>
        </figure>
        <div className="mt-5 space-y-3 text-sm leading-7 text-charcoal"><p>{isFr ? "Je mange Africain est une épicerie digitale installée en France, née pour rendre les produits authentiques de la cuisine africaine aussi simples à trouver qu'à cuisiner." : "Je mange Africain is a digital grocery based in France, created to make authentic African ingredients as easy to find as they are to cook."}</p><p>{isFr ? "La plateforme n'est pas une marketplace : l'entreprise reste l'unique vendeuse et conserve la maîtrise de la sélection, des prix, des stocks et de la qualité logistique." : "The platform is not a marketplace: the company remains the sole seller and controls selection, pricing, inventory and logistics quality."}</p></div>
      </div>
      <aside className="self-start border-t border-charcoal/8 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <p className="jma-eyebrow">{isFr ? "Notre modèle" : "Our model"}</p>
        <div className="mt-2 divide-y divide-charcoal/8">{principles.map((principle) => <div key={principle.title} className="py-4 first:pt-2"><principle.icon className="h-5 w-5 text-terre" /><h2 className="mt-2 text-sm font-black text-charcoal">{principle.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{principle.text}</p></div>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" onClick={onCatalog} className="min-h-11 bg-terre text-white hover:bg-terre-dark"><ShoppingBag className="mr-1.5 h-4 w-4" />{isFr ? "Produits" : "Products"}</Button><Button type="button" variant="outline" onClick={onRecipes} className="min-h-11 border-burgundy/15 text-burgundy hover:bg-burgundy/5"><ChefHat className="mr-1.5 h-4 w-4" />{isFr ? "Recettes" : "Recipes"}</Button></div>
      </aside>
    </div>
  );
}

function SupportMetric({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return <div className="min-w-0 px-1.5 sm:px-3"><Icon className="mx-auto h-4 w-4 text-terre" /><p className="mt-1.5 font-display text-base font-semibold text-charcoal sm:text-lg">{value}</p><p className="mt-0.5 text-[8px] font-black uppercase leading-3.5 text-muted-foreground sm:text-[9px]">{label}</p></div>;
}

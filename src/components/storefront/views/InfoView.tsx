"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mail, Phone, MapPin, MessageSquare, CheckCircle2, Globe2, HeartHandshake, PackageCheck, LifeBuoy, Building2, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { PageBackButton } from "@/components/shared/PageBackButton";

interface ContactFormState {
  name: string;
  email: string;
  reason: string;
  orderNumber: string;
  subject: string;
  message: string;
}

const CONTACT_DRAFT_KEY = "jma-contact-draft";
const EMPTY_CONTACT_FORM: ContactFormState = { name: "", email: "", reason: "order", orderNumber: "", subject: "", message: "" };

export function InfoView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const page = params.infoPage || "about";

  const content: Record<string, { eyebrow?: string; title: string; description?: string; icon?: LucideIcon; body: React.ReactNode }> = {
    about: {
      eyebrow: locale === "fr" ? "Notre maison" : "Our company",
      title: locale === "fr" ? "À propos de Je mange Africain" : "About Je mange Africain",
      description: locale === "fr" ? "Une épicerie digitale française qui relie les produits, les recettes et une logistique européenne maîtrisée." : "A French digital grocer connecting authentic products, recipes and controlled European logistics.",
      icon: Building2,
      body: <AboutStory locale={locale} promise={t.promise} />,
    },
    help: {
      eyebrow: locale === "fr" ? "Assistance client" : "Customer support",
      title: locale === "fr" ? "Centre d'aide" : "Help center",
      description: locale === "fr" ? "Des réponses claires sur les recettes, les commandes, le paiement et la chaîne du froid." : "Clear answers about recipes, orders, payment and cold-chain delivery.",
      icon: LifeBuoy,
      body: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 divide-x divide-charcoal/10 border-y border-charcoal/10 py-4 text-center">
            <HelpMetric value="Europe" label={locale === "fr" ? "Zones desservies" : "Delivery zones"} />
            <HelpMetric value="3" label={locale === "fr" ? "Classes thermiques" : "Thermal classes"} />
            <HelpMetric value="FR / EN" label={locale === "fr" ? "Assistance" : "Support"} />
          </div>
          <Accordion type="single" collapsible className="w-full">
          {(locale === "fr" ? [
            ["Comment fonctionne le configurateur de recettes ?", "Choisissez une recette, indiquez le nombre de personnes, personnalisez (protéine, piment, kplô…). Le système calcule les quantités, choisit les conditionnements, estime les restes et le coût par personne. Ajoutez tout au panier en un clic."],
            ["Quels sont les délais de livraison ?", "Les transporteurs, tarifs et délais disponibles sont calculés selon le pays, le code postal, le poids et la classe thermique du panier. Vous comparez les options avant le paiement."],
            ["Comment sont gérés les produits frais et surgelés ?", "Chaque produit a une classe thermique (ambiant, réfrigéré, surgelé). Votre commande est expédiée en plusieurs colis selon les classes, avec chaîne du froid respectée."],
            ["Puis-je commander sans compte ?", "Vous pouvez explorer le catalogue et composer votre panier librement. La connexion devient obligatoire avant le paiement afin de sécuriser l'adresse, la facture et le suivi de livraison."],
            ["Quels moyens de paiement acceptez-vous ?", "Le paiement par carte est sécurisé par Stripe. Les moyens accélérés compatibles avec votre appareil et votre pays apparaissent directement à l'étape de paiement lorsqu'ils sont disponibles."],
            ["Comment se passe un remboursement ?", "Pour un produit manquant ou abîmé, contactez le service client avec votre numéro de commande et les justificatifs utiles. Après contrôle, la solution applicable vous est confirmée par e-mail."],
          ] : [
            ["How does the recipe configurator work?", "Pick a recipe, set the number of people, customize (protein, spice, kplô…). The system computes quantities, picks packaging, estimates leftovers and cost per person. Add everything to cart in one click."],
            ["What are the delivery times?", "Available carriers, prices and delivery windows are calculated from the country, postcode, basket weight and thermal class. You compare the options before payment."],
            ["How are fresh and frozen products handled?", "Each product has a thermal class (ambient, chilled, frozen). Your order ships in multiple parcels by class, with cold chain respected."],
            ["Can I order without an account?", "You can browse the catalogue and build your basket freely. Sign-in is required before payment to secure the address, invoice and delivery tracking."],
            ["Which payment methods do you accept?", "Card payments are secured by Stripe. Accelerated methods supported by your device and country appear at checkout whenever they are available."],
            ["How do refunds work?", "For missing or damaged items, contact support with your order number and supporting evidence. After review, the applicable solution is confirmed by email."],
          ]).map(([q, a], i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-sm font-medium text-charcoal">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
          </Accordion>
          <div className="flex items-start gap-3 border-t border-charcoal/10 pt-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre/8 text-terre"><Mail className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Une question plus précise ?" : "A more specific question?"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Transmettez le contexte et, si besoin, votre numéro de commande." : "Send the context and your order number when relevant."}</p><button type="button" onClick={() => navigate("info", { infoPage: "contact" })} className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-terre hover:underline">{locale === "fr" ? "Ouvrir le formulaire" : "Open the form"}<ArrowRight className="h-3.5 w-3.5" /></button></div>
          </div>
        </div>
      ),
    },
    contact: {
      eyebrow: locale === "fr" ? "Échange direct" : "Direct contact",
      title: locale === "fr" ? "Contactez-nous" : "Contact us",
      description: locale === "fr" ? "Choisissez le motif et ajoutez les informations utiles pour une prise en charge plus rapide." : "Choose a reason and add the relevant details for faster handling.",
      icon: MessageSquare,
      body: <ContactForm locale={locale} />,
    },
    cgv: { title: locale === "fr" ? "Conditions générales" : "Terms", body: <LegalDocument kind="terms" locale={locale} /> },
    privacy: { title: locale === "fr" ? "Politique de confidentialité" : "Privacy policy", body: <LegalDocument kind="privacy" locale={locale} /> },
    cookies: { title: locale === "fr" ? "Politique de cookies" : "Cookie policy", body: <LegalDocument kind="cookies" locale={locale} /> },
    delivery: { title: locale === "fr" ? "Livraison & remboursement" : "Delivery & refunds", body: <LegalDocument kind="delivery" locale={locale} /> },
  };

  const c = content[page] || content.about;
  const isLegalPage = ["cgv", "privacy", "cookies", "delivery"].includes(page);
  const PageIcon = c.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-7 md:py-12 lg:px-8">
      <PageBackButton fallbackView="home" className="mb-3" />
      {!isLegalPage ? <header className="mb-6 border-b border-charcoal/10 pb-6"><div className="flex items-start gap-3">{PageIcon ? <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-md bg-terre/8 text-terre"><PageIcon className="h-5 w-5" /></span> : null}<div><p className="jma-eyebrow">{c.eyebrow}</p><h1 className="jma-section-title mt-1">{c.title}</h1>{c.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{c.description}</p> : null}</div></div></header> : null}
      <div>{c.body}</div>
    </div>
  );
}

function ContactForm({ locale }: { locale: "fr" | "en" }) {
  const customer = useStore((state) => state.customer);
  const [form, setForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);
  const formRef = useRef<ContactFormState>(EMPTY_CONTACT_FORM);
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const reasons = locale === "fr"
    ? { order: "Commande", delivery: "Livraison", product: "Produit", recipe: "Recette", wholesale: "Marché de gros", other: "Autre demande" }
    : { order: "Order", delivery: "Delivery", product: "Product", recipe: "Recipe", wholesale: "Wholesale", other: "Other request" };
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE;
  const updateField = (field: keyof typeof form, value: string) => {
    const next = { ...formRef.current, [field]: value };
    formRef.current = next;
    setForm(next);
    persistContactDraft(next);
  };

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(CONTACT_DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<ContactFormState>;
      const restored = { ...EMPTY_CONTACT_FORM, ...parsed };
      formRef.current = restored;
      setForm(restored);
    } catch {
      window.sessionStorage.removeItem(CONTACT_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!customer) return;
    const current = formRef.current;
    const next = {
      ...current,
      name: current.name || `${customer.firstName} ${customer.lastName}`.trim(),
      email: current.email || customer.email,
    };
    formRef.current = next;
    setForm(next);
    persistContactDraft(next);
  }, [customer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    setMessage("");
    const reasonLabel = reasons[form.reason as keyof typeof reasons];
    const orderContext = form.orderNumber.trim() ? `${locale === "fr" ? "Commande" : "Order"}: ${form.orderNumber.trim()}` : "";
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
      setMessage(payload.error || (locale === "fr" ? "Votre message n'a pas pu être envoyé." : "Your message could not be sent."));
      return;
    }
    setStatus("success");
    setMessage(locale === "fr" ? `Message enregistré sous la référence ${payload.reference}. Réponse sous 48 h.` : `Message saved as ${payload.reference}. We will reply within 48 hours.`);
    const reset = { ...EMPTY_CONTACT_FORM, name: customer ? `${customer.firstName} ${customer.lastName}`.trim() : "", email: customer?.email || "" };
    formRef.current = reset;
    setForm(reset);
    window.sessionStorage.removeItem(CONTACT_DRAFT_KEY);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="contact-name" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Nom" : "Name"}</Label><Input id="contact-name" name="name" autoComplete="name" maxLength={120} value={form.name} onChange={(e) => updateField("name", e.target.value)} required /></div>
        <div><Label htmlFor="contact-email" className="mb-1 block text-xs font-semibold">E-mail</Label><Input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => updateField("email", e.target.value)} required /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="contact-reason" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Motif" : "Reason"}</Label><select id="contact-reason" name="reason" value={form.reason} onChange={(event) => updateField("reason", event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">{Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><Label htmlFor="contact-order" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "N° de commande (facultatif)" : "Order number (optional)"}</Label><Input id="contact-order" name="orderNumber" maxLength={40} value={form.orderNumber} onChange={(event) => updateField("orderNumber", event.target.value)} placeholder="JMA-..." /></div></div>
      <div><Label htmlFor="contact-subject" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Objet" : "Subject"}</Label><Input id="contact-subject" name="subject" maxLength={80} value={form.subject} onChange={(e) => updateField("subject", e.target.value)} required /></div>
      <div><Label htmlFor="contact-message" className="mb-1 block text-xs font-semibold">Message</Label><Textarea id="contact-message" name="message" rows={6} minLength={10} maxLength={4500} value={form.message} onChange={(e) => updateField("message", e.target.value)} required /><p className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">{form.message.length} / 4500</p></div>
      {message ? <div role={status === "error" ? "alert" : "status"} className={`flex gap-2 rounded-md border p-3 text-xs ${status === "success" ? "border-burgundy/25 bg-burgundy/5 text-burgundy" : "border-destructive/25 bg-destructive/[0.06] text-destructive"}`}>{status === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}<span>{message}</span></div> : null}
      <Button type="submit" disabled={status === "busy"} className="w-full bg-terre text-cream hover:bg-terre-dark sm:w-auto"><MessageSquare className="mr-1 h-4 w-4" /> {status === "busy" ? (locale === "fr" ? "Envoi..." : "Sending...") : (locale === "fr" ? "Envoyer la demande" : "Send request")}</Button>
      <div className={`grid gap-3 border-t border-border pt-5 text-xs text-muted-foreground ${companyPhone ? "sm:grid-cols-3" : "sm:grid-cols-2"} sm:text-center`}>
        {companyPhone ? <a href={`tel:${companyPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 sm:flex-col sm:gap-1"><Phone className="h-4 w-4 shrink-0 text-terre" /> {companyPhone}</a> : null}
        <a href="mailto:bonjour@je-mange-africain.com" className="flex min-w-0 items-center gap-2 break-all sm:flex-col sm:gap-1"><Mail className="h-4 w-4 shrink-0 text-terre" /> bonjour@je-mange-africain.com</a>
        <div className="flex items-center gap-2 sm:flex-col sm:gap-1"><MapPin className="h-4 w-4 shrink-0 text-terre" /> Paris, France</div>
      </div>
    </form>
  );
}

function persistContactDraft(form: ContactFormState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(form));
}

function AboutStory({ locale, promise }: { locale: "fr" | "en"; promise: string }) {
  const principles = locale === "fr"
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
    <div className="space-y-7">
      <figure className="relative aspect-[16/10] overflow-hidden rounded-lg">
        <Image src="/hero-feast-v2.webp" alt={locale === "fr" ? "Table de plats africains" : "Table of African dishes"} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
        <span className="absolute inset-0 bg-charcoal/28" />
        <figcaption className="absolute inset-x-0 bottom-0 p-5 font-display text-2xl font-semibold leading-tight text-white sm:p-7 sm:text-3xl">{promise}</figcaption>
      </figure>
      <div className="space-y-4 text-sm leading-7 text-charcoal">
        <p>{locale === "fr" ? "Je mange Africain est une épicerie digitale installée en France, née pour rendre les produits authentiques de la cuisine africaine aussi simples à trouver qu'à cuisiner." : "Je mange Africain is a digital grocery based in France, created to make authentic African ingredients as easy to find as they are to cook."}</p>
        <p>{locale === "fr" ? "La plateforme n'est pas une marketplace : l'entreprise reste l'unique vendeuse et conserve la maîtrise de la sélection, des prix, des stocks et de la qualité logistique." : "The platform is not a marketplace: the company remains the sole seller and controls selection, pricing, inventory and logistics quality."}</p>
      </div>
      <div className="grid border-y border-charcoal/10 sm:grid-cols-3 sm:divide-x sm:divide-charcoal/10">
        {principles.map((principle) => <div key={principle.title} className="border-b border-charcoal/10 py-5 last:border-b-0 sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"><principle.icon className="h-5 w-5 text-terre" /><h2 className="mt-3 font-display text-lg font-semibold text-charcoal">{principle.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{principle.text}</p></div>)}
      </div>
    </div>
  );
}

function HelpMetric({ value, label }: { value: string; label: string }) {
  return <div className="min-w-0 px-2"><p className="font-display text-lg font-semibold text-charcoal">{value}</p><p className="mt-1 text-[9px] font-bold uppercase leading-4 text-muted-foreground">{label}</p></div>;
}

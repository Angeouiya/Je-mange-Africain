"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, Phone, MapPin, MessageSquare, CheckCircle2, Globe2, HeartHandshake, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { PageBackButton } from "@/components/shared/PageBackButton";

export function InfoView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const t = dict[locale];
  const page = params.infoPage || "about";

  const content: Record<string, { title: string; body: React.ReactNode }> = {
    about: {
      title: locale === "fr" ? "À propos de Je mange Africain" : "About Je mange Africain",
      body: <AboutStory locale={locale} promise={t.promise} />,
    },
    help: {
      title: locale === "fr" ? "Centre d'aide" : "Help center",
      body: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 divide-x divide-charcoal/10 border-y border-charcoal/10 py-4 text-center">
            <HelpMetric value="48–72 h" label={locale === "fr" ? "Livraison standard" : "Standard delivery"} />
            <HelpMetric value="3" label={locale === "fr" ? "Classes thermiques" : "Thermal classes"} />
            <HelpMetric value="FR / EN" label={locale === "fr" ? "Assistance" : "Support"} />
          </div>
          <Accordion type="single" collapsible className="w-full">
          {(locale === "fr" ? [
            ["Comment fonctionne le configurateur de recettes ?", "Choisissez une recette, indiquez le nombre de personnes, personnalisez (protéine, piment, kplô…). Le système calcule les quantités, choisit les conditionnements, estime les restes et le coût par personne. Ajoutez tout au panier en un clic."],
            ["Quels sont les délais de livraison ?", "Livraison standard sous 48-72h en France, 24h en express. Livraison offerte dès 50 € d'achat."],
            ["Comment sont gérés les produits frais et surgelés ?", "Chaque produit a une classe thermique (ambiant, réfrigéré, surgelé). Votre commande est expédiée en plusieurs colis selon les classes, avec chaîne du froid respectée."],
            ["Puis-je commander sans compte ?", "Vous pouvez explorer le catalogue et composer votre panier librement. La connexion devient obligatoire avant le paiement afin de sécuriser l'adresse, la facture et le suivi de livraison."],
            ["Quels moyens de paiement acceptez-vous ?", "Carte bancaire, Apple Pay, Google Pay, PayPal, cartes cadeaux et avoirs. Paiement vérifié côté serveur."],
            ["Comment se passe un remboursement ?", "En cas de produit manquant ou abîmé, ouvrez une réclamation depuis votre compte. Notre service client traite sous 48h et émet un avoir ou un remboursement."],
          ] : [
            ["How does the recipe configurator work?", "Pick a recipe, set the number of people, customize (protein, spice, kplô…). The system computes quantities, picks packaging, estimates leftovers and cost per person. Add everything to cart in one click."],
            ["What are the delivery times?", "Standard delivery within 48-72h in France, 24h express. Free delivery from €50."],
            ["How are fresh and frozen products handled?", "Each product has a thermal class (ambient, chilled, frozen). Your order ships in multiple parcels by class, with cold chain respected."],
            ["Can I order without an account?", "You can browse the catalogue and build your basket freely. Sign-in is required before payment to secure the address, invoice and delivery tracking."],
            ["Which payment methods do you accept?", "Credit card, Apple Pay, Google Pay, PayPal, gift cards and store credit. Payment verified server-side."],
            ["How do refunds work?", "For missing or damaged products, open a claim from your account. Our support handles it within 48h and issues credit or a refund."],
          ]).map(([q, a], i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-sm font-medium text-charcoal">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
          </Accordion>
          <div className="flex items-start gap-3 border-t border-charcoal/10 pt-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre/8 text-terre"><Mail className="h-4 w-4" /></span>
            <div><p className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Une question plus précise ?" : "A more specific question?"}</p><a href="mailto:bonjour@je-mange-africain.com" className="mt-1 block text-xs font-semibold text-terre hover:underline">bonjour@je-mange-africain.com</a></div>
          </div>
        </div>
      ),
    },
    contact: {
      title: locale === "fr" ? "Contactez-nous" : "Contact us",
      body: <ContactForm locale={locale} />,
    },
    cgv: { title: locale === "fr" ? "Conditions générales" : "Terms", body: <LegalDocument kind="terms" locale={locale} /> },
    privacy: { title: locale === "fr" ? "Politique de confidentialité" : "Privacy policy", body: <LegalDocument kind="privacy" locale={locale} /> },
    cookies: { title: locale === "fr" ? "Politique de cookies" : "Cookie policy", body: <LegalDocument kind="cookies" locale={locale} /> },
    delivery: { title: locale === "fr" ? "Livraison & remboursement" : "Delivery & refunds", body: <LegalDocument kind="delivery" locale={locale} /> },
  };

  const c = content[page] || content.about;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-7 md:py-12 lg:px-8">
      <PageBackButton fallbackView="home" className="mb-3" />
      <h1 className="jma-section-title mb-6">{c.title}</h1>
      <div className="border-t border-charcoal/10 pt-6">{c.body}</div>
    </div>
  );
}

function ContactForm({ locale }: { locale: string }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    setMessage("");
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setStatus("error");
      setMessage(payload.error || (locale === "fr" ? "Votre message n'a pas pu être envoyé." : "Your message could not be sent."));
      return;
    }
    setStatus("success");
    setMessage(locale === "fr" ? `Message enregistré sous la référence ${payload.reference}. Réponse sous 48 h.` : `Message saved as ${payload.reference}. We will reply within 48 hours.`);
    setForm({ name: "", email: "", subject: "", message: "" });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="contact-name" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Nom" : "Name"}</Label><Input id="contact-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><Label htmlFor="contact-email" className="mb-1 block text-xs font-semibold">E-mail</Label><Input id="contact-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
      </div>
      <div><Label htmlFor="contact-subject" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Objet" : "Subject"}</Label><Input id="contact-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
      <div><Label htmlFor="contact-message" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Message" : "Message"}</Label><Textarea id="contact-message" rows={5} minLength={10} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
      {message ? <div role={status === "error" ? "alert" : "status"} className={`flex gap-2 rounded-lg border p-3 text-xs ${status === "success" ? "border-forest/25 bg-forest/5 text-forest" : "border-red-200 bg-red-50 text-red-800"}`}>{status === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}<span>{message}</span></div> : null}
      <Button type="submit" disabled={status === "busy"} className="bg-terre text-cream hover:bg-terre-dark"><MessageSquare className="mr-1 h-4 w-4" /> {status === "busy" ? (locale === "fr" ? "Envoi..." : "Sending...") : (locale === "fr" ? "Envoyer" : "Send")}</Button>
      <div className="grid gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:grid-cols-3 sm:text-center">
        <a href="tel:+33180000000" className="flex items-center gap-2 sm:flex-col sm:gap-1"><Phone className="h-4 w-4 shrink-0 text-terre" /> +33 1 80 00 00 00</a>
        <a href="mailto:bonjour@je-mange-africain.com" className="flex min-w-0 items-center gap-2 break-all sm:flex-col sm:gap-1"><Mail className="h-4 w-4 shrink-0 text-terre" /> bonjour@je-mange-africain.com</a>
        <div className="flex items-center gap-2 sm:flex-col sm:gap-1"><MapPin className="h-4 w-4 shrink-0 text-terre" /> Paris, France</div>
      </div>
    </form>
  );
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

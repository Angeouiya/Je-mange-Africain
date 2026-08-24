"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { toast } from "sonner";

export function InfoView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const t = dict[locale];
  const page = params.infoPage || "about";

  const content: Record<string, { title: string; body: React.ReactNode }> = {
    about: {
      title: locale === "fr" ? "À propos de Je mange Africain" : "About Je mange Africain",
      body: (
        <div className="space-y-4 text-sm leading-relaxed text-charcoal">
          <p>{locale === "fr" ? "« Je mange Africain » est une épicerie africaine digitale installée en France. Notre mission : permettre à toutes les personnes vivant en France puis en Europe de retrouver les produits authentiques de la cuisine africaine, livrés chez elles." : "« Je mange Africain » is a digital African grocery based in France. Our mission: to enable everyone living in France and then Europe to find authentic African cooking products, delivered to their door."}</p>
          <p>{locale === "fr" ? "L'entreprise est l'unique vendeuse : elle sélectionne, importe, stocke, commercialise et livre elle-même ses produits. Aucun vendeur externe, aucune marketplace." : "The company is the sole seller: it selects, imports, stores, markets and delivers its products itself. No external sellers, no marketplace."}</p>
          <p>{locale === "fr" ? "Notre avantage concurrentiel : un moteur de recettes intelligentes qui calcule pour vous les quantités, les conditionnements, le coût total et le coût par personne, puis commande tous les ingrédients en une seule opération." : "Our competitive edge: a smart recipe engine that computes quantities, packaging, total cost and cost per person for you, then orders all ingredients in a single operation."}</p>
          <p className="font-semibold text-terre">{t.home.promise}</p>
        </div>
      ),
    },
    help: {
      title: locale === "fr" ? "Centre d'aide" : "Help center",
      body: (
        <Accordion type="single" collapsible className="w-full">
          {(locale === "fr" ? [
            ["Comment fonctionne le configurateur de recettes ?", "Choisissez une recette, indiquez le nombre de personnes, personnalisez (protéine, piment, kplô…). Le système calcule les quantités, choisit les conditionnements, estime les restes et le coût par personne. Ajoutez tout au panier en un clic."],
            ["Quels sont les délais de livraison ?", "Livraison standard sous 48-72h en France, 24h en express. Livraison offerte dès 50 € d'achat."],
            ["Comment sont gérés les produits frais et surgelés ?", "Chaque produit a une classe thermique (ambiant, réfrigéré, surgelé). Votre commande est expédiée en plusieurs colis selon les classes, avec chaîne du froid respectée."],
            ["Puis-je commander sans compte ?", "Oui, la commande invité est possible, mais un compte permet de suivre vos colis, sauvegarder vos recettes et cumuler des points de fidélité."],
            ["Quels moyens de paiement acceptez-vous ?", "Carte bancaire, Apple Pay, Google Pay, PayPal, cartes cadeaux et avoirs. Paiement vérifié côté serveur."],
            ["Comment se passe un remboursement ?", "En cas de produit manquant ou abîmé, ouvrez une réclamation depuis votre compte. Notre service client traite sous 48h et émet un avoir ou un remboursement."],
          ] : [
            ["How does the recipe configurator work?", "Pick a recipe, set the number of people, customize (protein, spice, kplô…). The system computes quantities, picks packaging, estimates leftovers and cost per person. Add everything to cart in one click."],
            ["What are the delivery times?", "Standard delivery within 48-72h in France, 24h express. Free delivery from €50."],
            ["How are fresh and frozen products handled?", "Each product has a thermal class (ambient, chilled, frozen). Your order ships in multiple parcels by class, with cold chain respected."],
            ["Can I order without an account?", "Yes, guest checkout is possible, but an account lets you track parcels, save recipes and earn loyalty points."],
            ["Which payment methods do you accept?", "Credit card, Apple Pay, Google Pay, PayPal, gift cards and store credit. Payment verified server-side."],
            ["How do refunds work?", "For missing or damaged products, open a claim from your account. Our support handles it within 48h and issues credit or a refund."],
          ]).map(([q, a], i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-sm font-medium text-charcoal">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ),
    },
    contact: {
      title: locale === "fr" ? "Contactez-nous" : "Contact us",
      body: <ContactForm locale={locale} />,
    },
    cgv: { title: locale === "fr" ? "Conditions générales de vente" : "Terms of sale", body: <LegalText kind="cgv" locale={locale} /> },
    privacy: { title: locale === "fr" ? "Politique de confidentialité" : "Privacy policy", body: <LegalText kind="privacy" locale={locale} /> },
    cookies: { title: locale === "fr" ? "Politique de cookies" : "Cookie policy", body: <LegalText kind="cookies" locale={locale} /> },
    delivery: { title: locale === "fr" ? "Livraison & remboursement" : "Delivery & refunds", body: <LegalText kind="delivery" locale={locale} /> },
  };

  const c = content[page] || content.about;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="mb-5 text-2xl font-bold text-charcoal md:text-3xl">{c.title}</h1>
      <div className="rounded-2xl border border-border bg-card p-5 md:p-7">{c.body}</div>
    </div>
  );
}

function ContactForm({ locale }: { locale: string }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(locale === "fr" ? "Message envoyé ! Nous vous répondrons sous 48h." : "Message sent! We'll reply within 48h.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Nom" : "Name"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><Label className="mb-1 block text-xs font-semibold">E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
      </div>
      <div><Label className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Objet" : "Subject"}</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
      <div><Label className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Message" : "Message"}</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
      <Button type="submit" className="bg-terre text-cream hover:bg-terre-dark"><MessageSquare className="mr-1 h-4 w-4" /> {locale === "fr" ? "Envoyer" : "Send"}</Button>
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-1"><Phone className="h-4 w-4 text-terre" /> +33 1 80 00 00 00</div>
        <div className="flex flex-col items-center gap-1"><Mail className="h-4 w-4 text-terre" /> bonjour@jemangeafricain.fr</div>
        <div className="flex flex-col items-center gap-1"><MapPin className="h-4 w-4 text-terre" /> Paris, France</div>
      </div>
    </form>
  );
}

function LegalText({ kind, locale }: { kind: string; locale: string }) {
  const fr: Record<string, string[]> = {
    cgv: [
      "Les présentes conditions générales de vente régissent les ventes de produits alimentaires effectuées par la société Je mange Africain sur sa plateforme.",
      "Toute commande implique l'acceptation des présentes CGV. Les produits sont vendus dans la limite des stocks disponibles.",
      "Les prix sont indiqués en euros, toutes taxes comprises. La TVA applicable est celle en vigueur au lieu de livraison.",
      "Le paiement est sécurisé et vérifié côté serveur. Aucune donnée bancaire n'est stockée par nos soins.",
      "Le délai de rétractation légal de 14 jours ne s'applique pas aux denrées périssables, conformément à l'article L221-28 du Code de la consommation.",
    ],
    privacy: [
      "Je mange Africain s'engage à protéger vos données personnelles conformément au RGPD.",
      "Vos données sont collectées aux fins de traitement des commandes, du service client et (avec consentement) de la newsletter.",
      "Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données.",
      "Pour exercer ces droits, contactez dpo@jemangeafricain.fr.",
      "Nous ne vendons jamais vos données à des tiers.",
    ],
    cookies: [
      "La plateforme utilise des cookies techniques nécessaires à son fonctionnement (panier, langue, session).",
      "Avec votre consentement, des cookies analytiques mesurent l'audience.",
      "Vous pouvez gérer vos préférences à tout temps depuis le bandeau de consentement.",
    ],
    delivery: [
      "Livraison en France entière puis en Europe. Frais calculés selon le poids, le volume et la classe thermique.",
      "Délais : standard 48-72h, express 24h, point relais 72h.",
      "Livraison offerte dès 50 € d'achat en France métropolitaine.",
      "En cas de produit manquant ou abîmé, ouvrez une réclamation sous 48h. Remboursement ou avoir émis sous 5 jours ouvrés.",
      "Les produits frais et surgelés respectent la chaîne du froid jusqu'à la livraison.",
    ],
  };
  const en: Record<string, string[]> = {
    cgv: [
      "These general terms of sale govern the sale of food products by Je mange Africain on its platform.",
      "Any order implies acceptance of these GTC. Products are sold subject to availability.",
      "Prices are in euros, all taxes included. Applicable VAT is that in force at the delivery location.",
      "Payment is secure and verified server-side. No banking data is stored by us.",
      "The legal 14-day withdrawal period does not apply to perishable goods, per Article L221-28 of the French Consumer Code.",
    ],
    privacy: [
      "Je mange Africain is committed to protecting your personal data in compliance with the GDPR.",
      "Your data is collected for order processing, customer service and (with consent) the newsletter.",
      "You have the right to access, rectify, erase and port your data.",
      "To exercise these rights, contact dpo@jemangeafricain.fr.",
      "We never sell your data to third parties.",
    ],
    cookies: [
      "The platform uses technical cookies necessary for its operation (cart, language, session).",
      "With your consent, analytical cookies measure audience.",
      "You can manage your preferences at any time from the consent banner.",
    ],
    delivery: [
      "Delivery across France and then Europe. Fees computed by weight, volume and thermal class.",
      "Times: standard 48-72h, express 24h, pickup point 72h.",
      "Free delivery from €50 in metropolitan France.",
      "For missing or damaged products, open a claim within 48h. Refund or credit issued within 5 business days.",
      "Fresh and frozen products respect the cold chain until delivery.",
    ],
  };
  const arr = (locale === "en" ? en : fr)[kind] || fr[kind] || [];
  return (
    <div className="space-y-3 text-sm leading-relaxed text-charcoal">
      {arr.map((p, i) => <p key={i}>{p}</p>)}
      <p className="pt-2 text-xs text-muted-foreground">{locale === "fr" ? "Ces textes doivent être validés juridiquement avant mise en production commerciale." : "These texts must be legally validated before commercial production launch."}</p>
    </div>
  );
}

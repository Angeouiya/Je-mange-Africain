"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { toast } from "sonner";
import { LegalDocument } from "@/components/storefront/LegalDocument";

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
    cgv: { title: locale === "fr" ? "Conditions générales" : "Terms", body: <LegalDocument kind="terms" locale={locale} /> },
    privacy: { title: locale === "fr" ? "Politique de confidentialité" : "Privacy policy", body: <LegalDocument kind="privacy" locale={locale} /> },
    cookies: { title: locale === "fr" ? "Politique de cookies" : "Cookie policy", body: <LegalDocument kind="cookies" locale={locale} /> },
    delivery: { title: locale === "fr" ? "Livraison & remboursement" : "Delivery & refunds", body: <LegalDocument kind="delivery" locale={locale} /> },
  };

  const c = content[page] || content.about;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="mb-5 text-2xl font-bold text-charcoal md:text-3xl">{c.title}</h1>
      <div className="jma-card rounded-2xl p-5 md:p-7">{c.body}</div>
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

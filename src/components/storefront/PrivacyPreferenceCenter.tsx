"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check, Cookie, LockKeyhole, Megaphone, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import {
  createPrivacyConsent,
  optionalConsentCount,
  PRIVACY_CONSENT_CHANGE_EVENT,
  PRIVACY_PREFERENCES_EVENT,
  readPrivacyConsent,
  savePrivacyConsent,
  type OptionalPrivacyPreference,
  type PrivacyConsent,
} from "@/lib/privacy-consent";

type PreferenceDraft = Record<OptionalPrivacyPreference, boolean>;
type Panel = "summary" | "preferences";

const EMPTY_PREFERENCES: PreferenceDraft = { analytics: false, personalization: false, marketing: false };

export function PrivacyPreferenceCenter() {
  const locale = useStore((state) => state.locale);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("summary");
  const [consent, setConsent] = useState<PrivacyConsent | null>(null);
  const [draft, setDraft] = useState<PreferenceDraft>(EMPTY_PREFERENCES);
  const isFr = locale === "fr";
  const hasRecordedChoice = Boolean(consent);
  const selectedCount = optionalConsentCount(draft);

  useEffect(() => {
    if (window.location.pathname !== "/") return;
    const stored = readPrivacyConsent();
    setConsent(stored);
    setDraft(preferencesFrom(stored));
    if (!stored) {
      setPanel("summary");
      setOpen(true);
    }

    const openPreferences = () => {
      const current = readPrivacyConsent();
      setConsent(current);
      setDraft(preferencesFrom(current));
      setPanel("preferences");
      setOpen(true);
    };
    const syncConsent = (event: Event) => {
      const next = (event as CustomEvent<PrivacyConsent>).detail;
      setConsent(next);
      setDraft(preferencesFrom(next));
    };
    window.addEventListener(PRIVACY_PREFERENCES_EVENT, openPreferences);
    window.addEventListener(PRIVACY_CONSENT_CHANGE_EVENT, syncConsent);
    return () => {
      window.removeEventListener(PRIVACY_PREFERENCES_EVENT, openPreferences);
      window.removeEventListener(PRIVACY_CONSENT_CHANGE_EVENT, syncConsent);
    };
  }, []);

  const commit = (preferences: PreferenceDraft) => {
    const next = createPrivacyConsent(preferences);
    savePrivacyConsent(next);
    setConsent(next);
    setDraft(preferences);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !hasRecordedChoice) return;
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={hasRecordedChoice}
        closeLabel={isFr ? "Fermer les préférences" : "Close preferences"}
        onEscapeKeyDown={(event) => { if (!hasRecordedChoice) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (!hasRecordedChoice) event.preventDefault(); }}
        className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-[42rem]"
        data-testid="privacy-preference-center"
      >
        <div className="african-kente-stripe h-[3px] shrink-0" />
        <DialogHeader className="shrink-0 border-b border-burgundy/10 bg-white px-5 py-5 pr-14 text-left sm:px-6">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[linear-gradient(145deg,rgba(185,71,43,0.14),rgba(242,169,0,0.09))] text-terre"><ShieldCheck className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Confidentialité européenne" : "European privacy"}</p>
              <DialogTitle className="mt-1">{panel === "summary" ? (isFr ? "Vos choix, sans détour" : "Your choices, made clear") : (isFr ? "Centre de préférences" : "Preference centre")}</DialogTitle>
              <DialogDescription className="mt-1 max-w-xl text-xs leading-5">{panel === "summary" ? (isFr ? "Les services essentiels fonctionnent immédiatement. Vous décidez séparément de toute utilisation optionnelle." : "Essential services work immediately. You separately control every optional use.") : (isFr ? "Modifiez chaque finalité à tout moment. Le refus n’altère ni le panier, ni le paiement, ni la livraison." : "Change each purpose at any time. Refusal does not affect basket, payment or delivery.")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {panel === "summary" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3 border-y border-burgundy/10 bg-[#FFF8F4] px-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy text-white"><LockKeyhole className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="text-xs font-black text-charcoal">{isFr ? "Nécessaires, toujours actifs" : "Necessary, always active"}</p><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{isFr ? "Session, sécurité, panier, langue et prévention de la fraude." : "Session, security, basket, language and fraud prevention."}</p></div>
              <Check className="ml-auto h-4 w-4 shrink-0 text-terre" />
            </div>
            <div className="mt-4 grid divide-y divide-burgundy/8 border-y border-burgundy/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <PrivacyFact icon={BarChart3} title={isFr ? "Mesure" : "Analytics"} detail={isFr ? "Comprendre les parcours" : "Understand journeys"} />
              <PrivacyFact icon={Sparkles} title={isFr ? "Personnalisation" : "Personalisation"} detail={isFr ? "Adapter les sélections" : "Tailor selections"} />
              <PrivacyFact icon={Megaphone} title={isFr ? "Marketing" : "Marketing"} detail={isFr ? "Mesurer les campagnes" : "Measure campaigns"} />
            </div>
            <p className="mt-4 text-[10px] leading-5 text-muted-foreground">{isFr ? "Aucun traceur optionnel n’est autorisé avant votre décision. Vos choix sont conservés pendant 12 mois et restent modifiables depuis la plateforme." : "No optional tracker is allowed before your decision. Choices are retained for 12 months and remain editable from the platform."}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-burgundy"><a href="/?view=info&infoPage=privacy" className="underline-offset-4 hover:underline">{isFr ? "Politique de confidentialité" : "Privacy policy"}</a><a href="/?view=info&infoPage=cookies" className="underline-offset-4 hover:underline">{isFr ? "Politique de cookies" : "Cookie policy"}</a></div>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); commit(draft); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3 border-b border-burgundy/10 pb-3"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Contrôle granulaire" : "Granular control"}</p><p className="mt-0.5 text-xs font-black text-charcoal">{selectedCount}/3 {isFr ? "finalités optionnelles actives" : "optional purposes active"}</p></div><SlidersHorizontal className="h-5 w-5 text-burgundy" /></div>
              <div className="divide-y divide-burgundy/8">
                <PreferenceRow icon={LockKeyhole} title={isFr ? "Fonctionnement nécessaire" : "Necessary operation"} detail={isFr ? "Compte, panier, paiement, sécurité et préférences demandées." : "Account, basket, payment, security and requested preferences."} checked locked locale={locale} onChange={() => undefined} />
                <PreferenceRow icon={BarChart3} title={isFr ? "Mesure d’audience" : "Audience analytics"} detail={isFr ? "Mesurer les performances et corriger les parcours, sans autoriser la publicité." : "Measure performance and improve journeys, without enabling advertising."} checked={draft.analytics} locale={locale} onChange={(analytics) => setDraft((current) => ({ ...current, analytics }))} />
                <PreferenceRow icon={Sparkles} title={isFr ? "Personnalisation" : "Personalisation"} detail={isFr ? "Mémoriser des sélections adaptées à vos intérêts culinaires." : "Remember selections tailored to your culinary interests."} checked={draft.personalization} locale={locale} onChange={(personalization) => setDraft((current) => ({ ...current, personalization }))} />
                <PreferenceRow icon={Megaphone} title={isFr ? "Mesure marketing" : "Marketing measurement"} detail={isFr ? "Évaluer les campagnes et promotions auxquelles vous avez été exposé." : "Evaluate campaigns and promotions shown to you."} checked={draft.marketing} locale={locale} onChange={(marketing) => setDraft((current) => ({ ...current, marketing }))} />
              </div>
            </div>
            <DialogFooter className="shrink-0 border-t border-burgundy/10 bg-white px-5 py-4 sm:px-6">
              {!hasRecordedChoice ? <Button type="button" variant="ghost" onClick={() => setPanel("summary")} className="text-muted-foreground">{isFr ? "Retour" : "Back"}</Button> : null}
              <Button type="button" variant="outline" onClick={() => commit(EMPTY_PREFERENCES)} className="border-burgundy/20 text-burgundy hover:bg-burgundy/[0.04]">{isFr ? "Tout refuser" : "Reject all"}</Button>
              <Button type="submit" className="bg-terre text-white hover:bg-terre-dark"><Check className="mr-1.5 h-4 w-4" />{isFr ? "Enregistrer mes choix" : "Save my choices"}</Button>
            </DialogFooter>
          </form>
        )}

        {panel === "summary" ? (
          <DialogFooter className="shrink-0 border-t border-burgundy/10 bg-white px-5 py-4 sm:px-6">
            <Button type="button" variant="ghost" onClick={() => setPanel("preferences")} className="text-burgundy"><SlidersHorizontal className="mr-1.5 h-4 w-4" />{isFr ? "Personnaliser" : "Customise"}</Button>
            <Button type="button" variant="outline" onClick={() => commit(EMPTY_PREFERENCES)} className="border-burgundy/20 text-burgundy hover:bg-burgundy/[0.04]">{isFr ? "Continuer sans options" : "Continue without optional"}</Button>
            <Button type="button" onClick={() => commit({ analytics: true, personalization: true, marketing: true })} className="bg-terre text-white hover:bg-terre-dark">{isFr ? "Tout accepter" : "Accept all"}</Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function preferencesFrom(consent: PrivacyConsent | null): PreferenceDraft {
  if (!consent) return { ...EMPTY_PREFERENCES };
  return { analytics: consent.analytics, personalization: consent.personalization, marketing: consent.marketing };
}

function PrivacyFact({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <div className="flex min-w-0 items-center gap-2.5 px-2 py-3 sm:block sm:px-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-terre/[0.08] text-terre"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0 sm:mt-2"><p className="text-[10px] font-black text-charcoal">{title}</p><p className="mt-0.5 text-[9px] leading-4 text-muted-foreground">{detail}</p></div></div>;
}

function PreferenceRow({ icon: Icon, title, detail, checked, locked = false, locale, onChange }: { icon: LucideIcon; title: string; detail: string; checked: boolean; locked?: boolean; locale: "fr" | "en"; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-[5.5rem] items-center gap-3 py-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${locked ? "bg-burgundy text-white" : "bg-terre/[0.08] text-terre"}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-black text-charcoal">{title}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{detail}</p></div>
      {locked ? <span className="shrink-0 text-[9px] font-black uppercase text-burgundy">{locale === "fr" ? "Toujours" : "Always"}</span> : <Switch checked={checked} onCheckedChange={onChange} aria-label={`${locale === "fr" ? "Autoriser" : "Allow"} ${title}`} className="data-[state=checked]:bg-terre data-[state=unchecked]:bg-charcoal/15" />}
    </div>
  );
}

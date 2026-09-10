"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectedPasswordRequirements } from "@/lib/password-policy";

type Status = "idle" | "busy" | "success" | "error";

export function PasswordChangeDialog({
  endpoint,
  locale,
  children,
}: {
  endpoint: string;
  locale: "fr" | "en";
  children: ReactNode;
}) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const requirements = useMemo(() => connectedPasswordRequirements(newPassword), [newPassword]);
  const ready = currentPassword.length >= 8
    && Object.values(requirements).every(Boolean)
    && confirmation === newPassword
    && currentPassword !== newPassword;

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setShowPasswords(false);
    setStatus("idle");
    setMessage("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const update = (setter: (value: string) => void, value: string) => {
    setter(value);
    if (status !== "busy") {
      setStatus("idle");
      setMessage("");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || status === "busy") return;
    setStatus("busy");
    setMessage("");
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmation }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { error?: string } : {};
    if (!response?.ok) {
      setStatus("error");
      setMessage(payload.error || (isFr ? "La modification est momentanément indisponible." : "The change is temporarily unavailable."));
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setStatus("success");
    setMessage(isFr
      ? "Votre mot de passe est modifié. Cette session reste ouverte et un e-mail de sécurité vous est envoyé."
      : "Your password has been changed. This session stays open and a security email is being sent to you.");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent mobileFullscreen closeLabel={isFr ? "Fermer" : "Close"} className="sm:max-w-xl" data-testid="password-change-dialog">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:block">
          <DialogHeader className="shrink-0 border-b border-burgundy/12 bg-[linear-gradient(118deg,#5A2632,#8A3042_62%,#B9472B)] px-5 pb-5 pt-[max(1.2rem,env(safe-area-inset-top))] pr-16 text-left text-white sm:rounded-t-lg sm:px-6 sm:py-6">
            <span className="grid h-11 w-11 place-items-center rounded-md border border-white/20 bg-white/10 text-gold"><KeyRound className="h-5 w-5" /></span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gold">{isFr ? "Sécurité du compte" : "Account security"}</p>
              <DialogTitle className="mt-1 text-xl text-white">{isFr ? "Modifier mon mot de passe" : "Change my password"}</DialogTitle>
              <DialogDescription className="mt-1 max-w-md text-xs leading-5 text-white/75">
                {isFr ? "Confirmez d'abord votre mot de passe actuel. Votre session restera ouverte sur cet appareil." : "Confirm your current password first. Your session will stay open on this device."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:max-h-[68svh] sm:px-6">
            {status === "success" ? (
              <div className="py-4 text-center" data-testid="password-change-success">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-burgundy/[0.08] text-burgundy"><ShieldCheck className="h-8 w-8" /></span>
                <h3 className="mt-5 text-lg font-black text-charcoal">{isFr ? "Modification confirmée" : "Change confirmed"}</h3>
                <p role="status" className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
                <div className="mx-auto mt-5 flex max-w-sm items-start gap-3 border-y border-gold/35 bg-gold/[0.07] px-4 py-3 text-left">
                  <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-terre" />
                  <p className="text-xs leading-5 text-charcoal">{isFr ? "L'e-mail de confirmation ne contient aucune information sensible. Si vous ne reconnaissez pas cette action, utilisez immédiatement la récupération de compte." : "The confirmation email contains no sensitive information. If you do not recognize this action, use account recovery immediately."}</p>
                </div>
                <DialogClose asChild><Button type="button" className="mt-6 min-h-11 bg-burgundy text-white hover:bg-burgundy/90">{isFr ? "Continuer dans mon espace" : "Continue in my account"}</Button></DialogClose>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5" noValidate>
                <PasswordField
                  id="current-password-change"
                  label={isFr ? "Mot de passe actuel" : "Current password"}
                  value={currentPassword}
                  onChange={(value) => update(setCurrentPassword, value)}
                  autoComplete="current-password"
                  visible={showPasswords}
                />
                <PasswordField
                  id="new-password-change"
                  label={isFr ? "Nouveau mot de passe" : "New password"}
                  value={newPassword}
                  onChange={(value) => update(setNewPassword, value)}
                  autoComplete="new-password"
                  visible={showPasswords}
                />
                <PasswordField
                  id="new-password-confirmation"
                  label={isFr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
                  value={confirmation}
                  onChange={(value) => update(setConfirmation, value)}
                  autoComplete="new-password"
                  visible={showPasswords}
                  invalid={confirmation.length > 0 && confirmation !== newPassword}
                />

                <button type="button" onClick={() => setShowPasswords((value) => !value)} className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-burgundy">
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPasswords ? (isFr ? "Masquer les mots de passe" : "Hide passwords") : (isFr ? "Afficher les mots de passe" : "Show passwords")}
                </button>

                <div className="grid grid-cols-2 gap-2 border-y border-charcoal/8 py-4 text-[10px] sm:grid-cols-3" aria-label={isFr ? "Exigences du mot de passe" : "Password requirements"}>
                  <Requirement met={requirements.length} label={isFr ? "8 caractères exactement" : "Exactly 8 characters"} />
                  <Requirement met={requirements.lowercase} label={isFr ? "Une minuscule" : "One lowercase"} />
                  <Requirement met={requirements.uppercase} label={isFr ? "Une majuscule" : "One uppercase"} />
                  <Requirement met={requirements.number} label={isFr ? "Un chiffre" : "One number"} />
                  <Requirement met={requirements.symbol} label={isFr ? "Un symbole" : "One symbol"} />
                  <Requirement met={confirmation.length > 0 && confirmation === newPassword} label={isFr ? "Confirmation identique" : "Matching confirmation"} />
                </div>

                {message ? <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/[0.05] px-3 py-2 text-xs leading-5 text-destructive">{message}</p> : null}

                <DialogFooter className="border-t border-charcoal/8 pt-4">
                  <DialogClose asChild><Button type="button" variant="outline">{isFr ? "Annuler" : "Cancel"}</Button></DialogClose>
                  <Button type="submit" disabled={!ready || status === "busy"} className="min-h-11 bg-terre text-white hover:bg-terre-dark">
                    {status === "busy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {status === "busy" ? (isFr ? "Vérification..." : "Verifying...") : (isFr ? "Modifier en toute sécurité" : "Change securely")}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, visible, invalid = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  invalid?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
        <Input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} required className="h-11 pl-9" />
      </div>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return <span className={`flex items-center gap-1.5 ${met ? "font-bold text-burgundy" : "text-muted-foreground"}`}><span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${met ? "bg-burgundy text-white" : "border border-charcoal/15 bg-white"}`}>{met ? <Check className="h-2.5 w-2.5" /> : null}</span>{label}</span>;
}

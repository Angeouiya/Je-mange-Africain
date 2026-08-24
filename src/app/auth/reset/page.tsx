"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PasswordResetPage() {
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setAccessToken(params.get("access_token") || "");
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setStatus("error");
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setStatus("busy");
    const response = await fetch("/api/auth/customer/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Le mot de passe n'a pas pu être modifié.");
      return;
    }
    setStatus("success");
    setMessage("Votre mot de passe a été modifié. Vous pouvez vous connecter.");
  };

  return (
    <main className="min-h-screen bg-cream px-4 py-8 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-sm sm:p-7">
        <a href="/" className="inline-flex" aria-label="Retour à l'accueil"><BrandLockup size="large" /></a>
        <div className="mt-8 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-terre/10 text-terre"><KeyRound className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-extrabold text-charcoal">Nouveau mot de passe</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choisissez au moins 8 caractères.</p>
          </div>
        </div>

        {!accessToken && status !== "success" ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Ce lien est incomplet ou a expiré. Demandez un nouvel e-mail depuis l'espace de connexion.</div>
        ) : status === "success" ? (
          <div className="mt-6 space-y-4">
            <div className="flex gap-3 rounded-lg border border-forest/25 bg-forest/5 p-4 text-sm text-forest"><CheckCircle2 className="h-5 w-5 shrink-0" /><p>{message}</p></div>
            <Button asChild className="w-full bg-terre text-cream hover:bg-terre-dark"><a href="/?view=account">Se connecter</a></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            <div><Label htmlFor="confirm-password">Confirmer le mot de passe</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
            {status === "error" ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p> : null}
            <Button type="submit" disabled={status === "busy"} className="w-full bg-terre text-cream hover:bg-terre-dark">{status === "busy" ? "Modification..." : "Modifier le mot de passe"}</Button>
          </form>
        )}
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminView } from "@/components/admin/AdminView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup } from "@/components/shared/BrandLockup";

type AdminSession = { email: string; role: string };

export function AdminGate() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload.user) setSession({ email: payload.user.email, role: payload.user.role });
      } catch {
        // The login form is the safe fallback for an absent or expired session.
      } finally {
        if (active) setChecking(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Connexion impossible.");
      setSession({ email: payload.user.email, role: payload.user.role });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    setSession(null);
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F6F7F2]">
        <LoaderCircle className="h-7 w-7 animate-spin text-terre" aria-label="Vérification de la session" />
      </div>
    );
  }

  if (session) return <AdminView adminEmail={session.email} adminRole={session.role} onLogout={logout} />;

  return (
    <main className="grid min-h-screen bg-[#F6F7F2] lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.72fr)]">
      <section className="relative hidden overflow-hidden bg-charcoal p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="african-kente-stripe absolute inset-x-0 top-0 h-1.5" />
        <BrandLockup context="admin" size="large" inverse />
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Console d'exploitation</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight">Piloter Je mange Africain avec précision.</h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-cream/70">Catalogue, recettes, stocks, commandes et conformité réunis dans un espace strictement réservé aux équipes autorisées.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream/55"><ShieldCheck className="h-4 w-4 text-gold" /> Accès contrôlé par rôles Supabase</div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <BrandLockup context="admin" size="large" className="mb-9 lg:hidden" />
          <div className="mb-8">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><LockKeyhole className="h-5 w-5" /></span>
            <h2 className="mt-5 text-2xl font-extrabold text-charcoal">Connexion administration</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Utilisez le compte professionnel attribué par la direction. Les comptes clients ne sont pas acceptés ici.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Adresse e-mail professionnelle</Label>
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="prenom@je-mange-africain.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Mot de passe</Label>
              <div className="relative">
                <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="pr-11" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-charcoal" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">{error}</p> : null}
            <Button type="submit" disabled={submitting} className="h-11 w-full bg-terre text-white hover:bg-terre-dark">
              {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
              {submitting ? "Vérification..." : "Accéder à la console"}
            </Button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">Accès journalisé. Toute tentative non autorisée peut faire l'objet d'un contrôle de sécurité.</p>
        </div>
      </section>
    </main>
  );
}

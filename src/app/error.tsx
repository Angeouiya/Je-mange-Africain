"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Storefront boundary", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12 text-center">
      <section className="w-full max-w-lg rounded-lg border border-burgundy/12 bg-white p-7 shadow-[0_24px_70px_-44px_rgba(90,38,50,0.75)]" role="alert">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-burgundy/[0.07] text-burgundy"><AlertTriangle className="h-5 w-5" /></span>
        <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-terre">Je mange Africain</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-charcoal">Cette page n’a pas pu s’afficher</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Vos données ne sont pas perdues. Relancez uniquement cette vue ou revenez à l’accueil.</p>
        {error.digest ? <p className="mt-3 font-mono text-[10px] text-muted-foreground">Référence : {error.digest}</p> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset} className="bg-terre text-white hover:bg-terre-dark"><RefreshCw className="h-4 w-4" />Réessayer</Button>
          <Button asChild variant="outline"><a href="/">Retour à l’accueil</a></Button>
        </div>
      </section>
    </main>
  );
}

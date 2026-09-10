import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12 text-center">
      <section className="w-full max-w-lg rounded-lg border border-burgundy/12 bg-white p-7 shadow-[0_24px_70px_-44px_rgba(90,38,50,0.75)]">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-gold/[0.14] text-terre"><Compass className="h-5 w-5" /></span>
        <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-terre">Erreur 404</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-charcoal">Cette destination n’existe pas</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Retrouvez le marché, les produits et les recettes depuis l’accueil.</p>
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-terre px-5 text-sm font-bold text-white transition hover:bg-terre-dark">Retour au marché</Link>
      </section>
    </main>
  );
}

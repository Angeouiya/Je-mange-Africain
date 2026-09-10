"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: "#FBF8F5", color: "#332A2D", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <section style={{ width: "min(100%, 480px)", background: "white", border: "1px solid rgba(138,48,66,.16)", borderRadius: 16, padding: 28 }} role="alert">
            <p style={{ color: "#B9472B", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Je mange Africain</p>
            <h1 style={{ margin: "8px 0", fontSize: 26 }}>L’application doit être relancée</h1>
            <p style={{ color: "#695D61", lineHeight: 1.6 }}>Une erreur générale est survenue. Réessayez ou revenez à l’accueil.</p>
            <button type="button" onClick={reset} style={{ marginTop: 18, minHeight: 44, border: 0, borderRadius: 8, padding: "0 18px", background: "#B9472B", color: "white", fontWeight: 800, cursor: "pointer" }}>Réessayer</button>
            <p><a href="/" style={{ color: "#8A3042", fontWeight: 700 }}>Retour à l’accueil</a></p>
          </section>
        </main>
      </body>
    </html>
  );
}

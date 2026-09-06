const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Je mange Africain - Cloudflare</title>
    <meta name="robots" content="noindex,nofollow" />
    <style>
      :root {
        color-scheme: light;
        --ink: #3b2523;
        --muted: #806a61;
        --terre: #c84c2e;
        --burgundy: #8a3042;
        --gold: #f2a900;
        --cream: #fff8f1;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100svh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at 50% 0%, #fff0dc 0, #fffaf5 42%, #ffffff 100%);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 28rem);
        border: 1px solid rgba(138, 48, 66, 0.14);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.82);
        padding: 1.2rem;
        box-shadow: 0 28px 70px -54px rgba(90, 38, 50, 0.75);
      }
      .mark {
        width: 3.2rem;
        height: 3.2rem;
        display: grid;
        place-items: center;
        border-radius: 16px;
        background: linear-gradient(135deg, var(--gold), var(--terre));
        color: white;
        font-size: 1.45rem;
        font-weight: 900;
        letter-spacing: 0;
      }
      p.kicker {
        margin: 1rem 0 0.3rem;
        color: var(--burgundy);
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(1.65rem, 8vw, 2.45rem);
        line-height: 1;
        letter-spacing: 0;
      }
      p {
        margin: 0.8rem 0 0;
        color: var(--muted);
        font-size: 0.95rem;
        line-height: 1.55;
      }
      .status {
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        border-top: 1px solid rgba(138, 48, 66, 0.12);
        padding-top: 0.9rem;
        color: var(--terre);
        font-size: 0.75rem;
        font-weight: 850;
      }
      .dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 999px;
        background: var(--gold);
        box-shadow: 0 0 0 0.35rem rgba(242, 169, 0, 0.16);
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">J</div>
      <p class="kicker">Cloudflare workers.dev</p>
      <h1>Je mange Africain</h1>
      <p>Le projet Cloudflare est cree. La plateforme complete sera publiee ici apres connexion des secrets production.</p>
      <div class="status"><span class="dot" aria-hidden="true"></span><span>En attente de Supabase JMA, Stripe et Redis</span></div>
    </main>
  </body>
</html>`;

const bootstrapWorker = {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "je-mange-africain",
        phase: "cloudflare-bootstrap",
      });
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  },
};

export default bootstrapWorker;

import "server-only";

import { sendGmailHtmlEmail } from "@/lib/gmail-email";

const SUBJECT = "Sécurité : votre mot de passe Je mange Africain a été modifié";

export async function sendPasswordChangedEmail(to: string) {
  const siteUrl = safeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return sendGmailHtmlEmail({
    to,
    subject: SUBJECT,
    text: passwordChangedText(to, siteUrl),
    html: renderPasswordChangedEmail(to, siteUrl),
  });
}

export function renderPasswordChangedEmail(to: string, siteUrl = "https://je-mange-africain.com") {
  const email = escapeHtml(to);
  const safeAccountUrl = safeSiteUrl(siteUrl);
  const accountUrl = escapeHtml(safeAccountUrl);
  const logoUrl = escapeHtml(new URL("/brand/notification-icon-burgundy.png", safeAccountUrl).toString());
  return `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Votre mot de passe a été modifié</title></head>
  <body style="margin:0;padding:0;background:#f7f0ec;color:#4d2c35;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f7f0ec;">
      <tr><td align="center" style="padding:28px 14px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;overflow:hidden;border-radius:18px;background:#ffffff;box-shadow:0 20px 55px rgba(90,38,50,.12);">
          <tr><td style="height:6px;background:#f2aa25;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:30px 34px 26px;background:#5a2632;color:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
              <td width="68" valign="middle"><div style="width:62px;height:62px;overflow:hidden;border:1px solid rgba(255,255,255,.28);border-radius:16px;background:#ffffff;text-align:center;"><img src="${logoUrl}" width="62" height="62" alt="Logo Je mange Africain" style="display:block;width:62px;height:62px;border:0;object-fit:cover;"></div></td>
              <td valign="middle" style="padding-left:14px;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;line-height:1.15;">Je mange Africain</div><div style="margin-top:4px;color:#f2d8c9;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Cuisine &amp; épicerie africaine</div></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:34px 34px 14px;">
            <div style="display:inline-block;border-radius:999px;background:#fff4eb;color:#b9472b;font-size:10px;font-weight:900;letter-spacing:.08em;padding:7px 11px;text-transform:uppercase;">Alerte de sécurité</div>
            <h1 style="margin:20px 0 12px;color:#4d2c35;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;">Votre mot de passe a été modifié</h1>
            <p style="margin:0;color:#755f66;font-size:15px;line-height:1.7;">Bonjour,</p>
            <p style="margin:10px 0 0;color:#755f66;font-size:15px;line-height:1.7;">Le mot de passe associé à <strong style="color:#4d2c35;">${email}</strong> vient d'être modifié avec succès. Votre session actuelle reste ouverte.</p>
          </td></tr>
          <tr><td style="padding:14px 34px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #ecdcd5;border-radius:14px;background:#fffbf8;"><tr>
              <td width="54" valign="top" style="padding:20px 0 20px 20px;color:#8a3042;font-size:24px;">&#10003;</td>
              <td style="padding:18px 20px 18px 10px;"><div style="color:#4d2c35;font-size:13px;font-weight:900;">Aucune action supplémentaire n'est requise</div><div style="margin-top:5px;color:#806b70;font-size:12px;line-height:1.6;">Si vous êtes à l'origine de cette modification, vous pouvez continuer à utiliser votre espace normalement.</div></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:14px 34px 8px;">
            <h2 style="margin:0;color:#8a3042;font-size:15px;line-height:1.4;">Vous ne reconnaissez pas cette action ?</h2>
            <p style="margin:8px 0 18px;color:#755f66;font-size:13px;line-height:1.65;">Réinitialisez immédiatement votre mot de passe depuis l'application et contactez notre assistance. Ne transférez jamais cet e-mail et ne communiquez aucun code.</p>
            <a href="${accountUrl}" style="display:inline-block;border-radius:10px;background:#b9472b;color:#ffffff;font-size:13px;font-weight:900;line-height:1;padding:14px 20px;text-decoration:none;">Ouvrir mon espace sécurisé</a>
          </td></tr>
          <tr><td style="padding:28px 34px 32px;">
            <div style="border-top:1px solid #eee1dc;padding-top:18px;color:#927e83;font-size:11px;line-height:1.6;"><strong style="color:#5a2632;">Je mange Africain</strong><br>Message automatique de sécurité envoyé via Gmail · Assistance : <a href="mailto:bonjour@je-mange-africain.com" style="color:#b9472b;text-decoration:none;">bonjour@je-mange-africain.com</a></div>
            <div style="margin-top:15px;color:#a18f93;font-size:10px;line-height:1.55;">English: The password for your account was changed successfully. If you did not make this change, reset it immediately from the app and contact support.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function passwordChangedText(to: string, siteUrl: string) {
  return [
    "Je mange Africain — Alerte de sécurité",
    "",
    `Le mot de passe associé à ${to} vient d'être modifié avec succès.`,
    "Votre session actuelle reste ouverte.",
    "",
    "Si vous ne reconnaissez pas cette action, réinitialisez immédiatement votre mot de passe et contactez l'assistance.",
    siteUrl,
    "",
    "Cet e-mail ne contient jamais votre mot de passe.",
  ].join("\n");
}

function safeSiteUrl(value?: string) {
  try {
    const url = new URL(value || "https://je-mange-africain.com");
    return url.protocol === "https:" ? url.toString() : "https://je-mange-africain.com";
  } catch {
    return "https://je-mange-africain.com";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

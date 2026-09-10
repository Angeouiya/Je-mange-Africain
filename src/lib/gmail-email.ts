import "server-only";

export type GmailEmailResult =
  | { sent: true; provider: "gmail"; messageId: string | null }
  | { sent: false; provider: "gmail"; reason: "not_configured" | "invalid_recipient" | "token_exchange_failed" | "send_failed" };

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderEmail: string;
  senderName: string;
};

export async function sendGmailHtmlEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<GmailEmailResult> {
  const config = gmailConfig();
  if (!config) return { sent: false, provider: "gmail", reason: "not_configured" };
  if (!isMailbox(input.to)) return { sent: false, provider: "gmail", reason: "invalid_recipient" };

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return { sent: false, provider: "gmail", reason: "token_exchange_failed" };
  }

  const tokenPayload = await tokenResponse.json().catch(() => ({})) as { access_token?: unknown };
  const accessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : "";
  if (!tokenResponse.ok || !accessToken) {
    return { sent: false, provider: "gmail", reason: "token_exchange_failed" };
  }

  const raw = createRawMessage({ ...input, ...config });
  try {
    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const sendPayload = await sendResponse.json().catch(() => ({})) as { id?: unknown };
    if (!sendResponse.ok) return { sent: false, provider: "gmail", reason: "send_failed" };
    return { sent: true, provider: "gmail", messageId: typeof sendPayload.id === "string" ? sendPayload.id : null };
  } catch {
    return { sent: false, provider: "gmail", reason: "send_failed" };
  }
}

function gmailConfig(): GmailConfig | null {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim() || "";
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim() || "";
  const senderEmail = process.env.GMAIL_SENDER_EMAIL?.trim() || "";
  const senderName = sanitizeHeader(process.env.GMAIL_SENDER_NAME?.trim() || "Je mange Africain");
  if (!clientId || !clientSecret || !refreshToken || !isMailbox(senderEmail)) return null;
  return { clientId, clientSecret, refreshToken, senderEmail, senderName };
}

function createRawMessage(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  senderEmail: string;
  senderName: string;
}) {
  const boundary = `jma-${crypto.randomUUID()}`;
  const lines = [
    `From: ${encodeMimeHeader(input.senderName)} <${input.senderEmail}>`,
    `To: ${input.to}`,
    `Subject: ${encodeMimeHeader(sanitizeHeader(input.subject))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(toBase64(input.text)),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(toBase64(input.html)),
    `--${boundary}--`,
  ];
  return toBase64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeMimeHeader(value: string) {
  return `=?UTF-8?B?${toBase64(value)}?=`;
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isMailbox(value: string) {
  return value.length <= 254 && !/[\r\n]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") || "";
}

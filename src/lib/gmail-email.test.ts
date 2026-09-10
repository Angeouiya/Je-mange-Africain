import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendGmailHtmlEmail } from "./gmail-email";

describe("Gmail email delivery", () => {
  beforeEach(() => {
    vi.stubEnv("GMAIL_CLIENT_ID", "google-client-id");
    vi.stubEnv("GMAIL_CLIENT_SECRET", "google-client-secret");
    vi.stubEnv("GMAIL_REFRESH_TOKEN", "google-refresh-token");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "bonjour@example.fr");
    vi.stubEnv("GMAIL_SENDER_NAME", "Je mange Africain");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("exchanges the refresh token and sends a base64url MIME message", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "short-lived-access-token" }))
      .mockResolvedValueOnce(Response.json({ id: "gmail-message-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGmailHtmlEmail({
      to: "awa@example.fr",
      subject: "Sécurité du compte",
      text: "Votre mot de passe a été modifié.",
      html: "<strong>Modification confirmée</strong>",
    });

    expect(result).toEqual({ sent: true, provider: "gmail", messageId: "gmail-message-1" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://oauth2.googleapis.com/token", expect.objectContaining({ method: "POST", cache: "no-store" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", expect.objectContaining({ method: "POST", cache: "no-store" }));
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as { raw: string };
    const padded = sendBody.raw.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(sendBody.raw.length / 4) * 4, "=");
    const mime = Buffer.from(padded, "base64").toString("utf8");
    expect(mime).toContain("To: awa@example.fr");
    expect(mime).toContain("Content-Type: multipart/alternative");
    expect(mime).not.toContain("google-refresh-token");
  });

  it("does not call Google when Gmail has not been configured", async () => {
    vi.stubEnv("GMAIL_REFRESH_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendGmailHtmlEmail({ to: "awa@example.fr", subject: "Test", text: "Test", html: "<p>Test</p>" }))
      .resolves.toEqual({ sent: false, provider: "gmail", reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an address containing a header injection", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGmailHtmlEmail({ to: "awa@example.fr\r\nBcc: attacker@example.fr", subject: "Test", text: "Test", html: "<p>Test</p>" });

    expect(result).toEqual({ sent: false, provider: "gmail", reason: "invalid_recipient" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

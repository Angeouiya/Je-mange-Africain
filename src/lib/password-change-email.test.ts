import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/gmail-email", () => ({ sendGmailHtmlEmail: mocks.send }));

import { renderPasswordChangedEmail, sendPasswordChangedEmail } from "./password-change-email";

describe("password changed email", () => {
  it("renders the branded security message and escapes user values", () => {
    const html = renderPasswordChangedEmail("awa+<script>@example.fr", "https://je-mange-africain.com/account");

    expect(html).toContain("Je mange Africain");
    expect(html).toContain("Alerte de sécurité");
    expect(html).toContain("/brand/notification-icon-burgundy.png");
    expect(html).toContain("alt=\"Logo Je mange Africain\"");
    expect(html).toContain("awa+&lt;script&gt;@example.fr");
    expect(html).not.toContain("awa+<script>@example.fr");
  });

  it("sends the message through Gmail without a password value", async () => {
    mocks.send.mockResolvedValue({ sent: true, provider: "gmail", messageId: "gmail-1" });

    await sendPasswordChangedEmail("awa@example.fr");

    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "awa@example.fr",
      subject: expect.stringContaining("mot de passe"),
      html: expect.stringContaining("Message automatique de sécurité envoyé via Gmail"),
    }));
  });
});

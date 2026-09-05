import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaymentRecoveryNotice } from "./PaymentRecoveryNotice";

describe("payment recovery notice", () => {
  it("explains an automatic refund with its reference", () => {
    const html = renderToStaticMarkup(createElement(PaymentRecoveryNotice, {
      locale: "fr",
      recovery: { status: "refund_submitted", reference: "re_checkout_42" },
    }));

    expect(html).toContain("Remboursement automatique lancé");
    expect(html).toContain("Aucune commande n&#x27;a été créée");
    expect(html).toContain("re_checkout_42");
    expect(html).toContain("role=\"status\"");
  });

  it("warns customers not to pay twice during reconciliation", () => {
    const html = renderToStaticMarkup(createElement(PaymentRecoveryNotice, {
      locale: "en",
      recovery: { status: "finalization_pending", reference: "pi_checkout_42" },
    }));

    expect(html).toContain("Payment protected, finalisation in progress");
    expect(html).toContain("Do not pay a second time");
    expect(html).toContain("pi_checkout_42");
  });
});

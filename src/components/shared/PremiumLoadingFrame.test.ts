import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PremiumLoadingFrame } from "./PremiumLoadingFrame";

describe("PremiumLoadingFrame", () => {
  it("renders an accessible storefront loading frame with the brand palette", () => {
    const html = renderToStaticMarkup(createElement(PremiumLoadingFrame, {
      locale: "fr",
      context: "client",
      label: "Chargement de la vue",
      testId: "storefront-view-loading",
    }));

    expect(html).toContain("role=\"status\"");
    expect(html).toContain("aria-label=\"Chargement de la vue\"");
    expect(html).toContain("data-testid=\"storefront-view-loading\"");
    expect(html).toContain("Je mange Africain");
    expect(html).toContain("#B9472B");
    expect(html).toContain("#F2A900");
  });

  it("renders the admin section variant without exposing storefront wording", () => {
    const html = renderToStaticMarkup(createElement(PremiumLoadingFrame, {
      locale: "en",
      context: "admin",
      density: "section",
      label: "Synchronising orders",
      testId: "admin-section-loading",
    }));

    expect(html).toContain("data-testid=\"admin-section-loading\"");
    expect(html).toContain("data-context=\"admin\"");
    expect(html).toContain("Synchronising orders");
    expect(html).toContain("Professional console");
    expect(html).not.toContain("Preparing your market");
  });
});

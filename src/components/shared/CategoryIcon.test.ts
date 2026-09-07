import { describe, expect, it } from "vitest";
import { categoryVisualKey } from "./CategoryIcon";

describe("category visual identity", () => {
  it("normalizes African grocery universes into stable visual keys", () => {
    expect(categoryVisualKey("Manioc & d\u00e9riv\u00e9s")).toBe("manioc");
    expect(categoryVisualKey("Farines & c\u00e9r\u00e9ales")).toBe("farines");
    expect(categoryVisualKey("F\u00e9culents, riz & plantain")).toBe("feculents");
    expect(categoryVisualKey("Viandes & traditionnels")).toBe("viandes");
    expect(categoryVisualKey("Poissons & fruits de mer")).toBe("poissons");
    expect(categoryVisualKey("L\u00e9gumes & feuilles")).toBe("legumes");
    expect(categoryVisualKey("L\u00e9gumineuses & graines")).toBe("legumineuses");
  });

  it("keeps category families distinct from ingredient keywords", () => {
    expect(categoryVisualKey("Sauces, \u00e9pices & condiments")).toBe("sauces");
    expect(categoryVisualKey("Piment frais")).toBe("epices");
    expect(categoryVisualKey("Bissap gingembre")).toBe("boissons");
    expect(categoryVisualKey("Desserts et douceurs")).toBe("desserts");
  });
});

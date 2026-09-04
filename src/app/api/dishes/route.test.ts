import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/dishes/route";

describe("GET /api/dishes", () => {
  it("returns a bilingual template that the professional recipe studio can import", async () => {
    const response = await GET(new NextRequest("http://localhost/api/dishes?bilingual=1&q=garba&limit=5"));
    const payload = await response.json();
    const garba = payload.dishes.find((dish: { slug: string }) => dish.slug === "garba-ivoirien");

    expect(response.status).toBe(200);
    expect(garba).toMatchObject({
      nameFr: "Garba ivoirien",
      nameEn: "Ivorian garba",
      country: "Côte d'Ivoire",
      category: "street-food",
      servings: 4,
    });
    expect(garba.stepsFr).toHaveLength(garba.stepsEn.length);
    expect(garba.ingredients[0]).toMatchObject({ nameFr: "Attiéké", nameEn: "Attieke", quantity: "600 g", role: "base" });
  });

  it("keeps the public response localized when template mode is not requested", async () => {
    const response = await GET(new NextRequest("http://localhost/api/dishes?locale=en&q=garba&limit=5"));
    const payload = await response.json();
    const garba = payload.dishes.find((dish: { slug: string }) => dish.slug === "garba-ivoirien");

    expect(garba.name).toBe("Ivorian garba");
    expect(garba.nameFr).toBeUndefined();
    expect(garba.steps[0]).toContain("tuna");
  });
});

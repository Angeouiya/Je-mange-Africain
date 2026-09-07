import { beforeEach, describe, expect, it } from "vitest";
import { customerProtectedDestination, customerProtectedView, mergeCustomerSafePersistedState, publicFallbackForAuthTarget, useStore, type CartItem, type Customer } from "./store";

const customer: Customer = {
  id: "customer-1",
  email: "awa@example.fr",
  phone: "+33612345678",
  firstName: "Awa",
  lastName: "Traore",
  role: "customer",
  loyaltyPoints: 0,
  walletCredit: 0,
};

const cartItem: Omit<CartItem, "id" | "qty"> & { qty: number } = {
  productId: "product-attieke",
  variantId: "default",
  name: "Attiéké",
  nameFr: "Attiéké",
  nameEn: "Attieke",
  unitPrice: 3.5,
  unitLabel: "500 g",
  packWeightGrams: 500,
  thermalClass: "REFRIGERATED",
  qty: 2,
  maxStock: 12,
  imageUrl: "/products/attieke.webp",
};

const persistedCartItem: CartItem = {
  ...cartItem,
  id: "line-stored-attieke",
};

function resetStore() {
  useStore.getState().logout();
  useStore.setState({
    locale: "fr",
    view: "home",
    params: {},
    navigationHistory: [],
    authReturnTarget: null,
    country: "France",
    postalCode: "75011",
    cart: [],
    coupon: null,
    favorites: [],
    savedRecipes: [],
    savedSyncStatus: "idle",
    savedOwnerId: null,
    recentlyViewed: [],
    customer: null,
    addresses: [],
    _hydrated: true,
  });
}

describe("customer auth guard", () => {
  beforeEach(resetStore);

  it("blocks anonymous cart mutations and opens customer sign-in", () => {
    const added = useStore.getState().addToCart(cartItem);
    const state = useStore.getState();

    expect(added).toBe(false);
    expect(state.cart).toEqual([]);
    expect(state.view).toBe("account");
    expect(state.params).toEqual({ returnView: "home" });
    expect(state.authReturnTarget).toEqual({ view: "home", params: {} });
  });

  it("redirects protected customer routes while preserving the intended return target", () => {
    useStore.getState().navigate("recipe-config", { recipeId: "recipe-garba" });
    const state = useStore.getState();

    expect(customerProtectedView("recipe-config")).toBe(true);
    expect(state.view).toBe("account");
    expect(state.params).toEqual({ returnView: "recipe-config" });
    expect(state.authReturnTarget).toEqual({ view: "recipe-config", params: { recipeId: "recipe-garba" } });
    expect(publicFallbackForAuthTarget(state.authReturnTarget)).toEqual({ view: "home", params: {} });
  });

  it("treats shopping, product, recipe and wholesale spaces as private client workspaces", () => {
    expect(customerProtectedView("home")).toBe(false);
    expect(customerProtectedView("info")).toBe(false);
    expect(customerProtectedView("account")).toBe(false);
    expect(customerProtectedDestination("info", { infoPage: "about" })).toBe(false);
    expect(customerProtectedDestination("info", { infoPage: "privacy" })).toBe(false);
    expect(customerProtectedDestination("info", { infoPage: "cgv" })).toBe(false);
    expect(customerProtectedDestination("info", { infoPage: "contact" })).toBe(true);

    for (const view of ["catalog", "product", "recipes", "wholesale", "cart", "orders"] as const) {
      expect(customerProtectedView(view)).toBe(true);
      expect(customerProtectedDestination(view)).toBe(true);
      expect(publicFallbackForAuthTarget({ view, params: {} })).toEqual({ view: "home", params: {} });
    }
    expect(publicFallbackForAuthTarget({ view: "info", params: { infoPage: "contact" } })).toEqual({ view: "home", params: {} });
  });

  it("allows connected customers to interact and clears private state on logout", () => {
    useStore.getState().setCustomer(customer);

    expect(useStore.getState().addToCart(cartItem)).toBe(true);
    expect(useStore.getState().toggleFavorite("product-attieke")).toBe(true);
    expect(useStore.getState().toggleSavedRecipe("recipe-garba")).toBe(true);

    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().favorites).toEqual(["product-attieke"]);
    expect(useStore.getState().savedRecipes).toEqual(["recipe-garba"]);

    useStore.getState().logout();

    expect(useStore.getState().customer).toBeNull();
    expect(useStore.getState().cart).toEqual([]);
    expect(useStore.getState().favorites).toEqual([]);
    expect(useStore.getState().savedRecipes).toEqual([]);
    expect(useStore.getState().recentlyViewed).toEqual([]);
  });

  it("does not trust a persisted customer profile before the server session is verified", () => {
    const merged = mergeCustomerSafePersistedState({
      customer,
      addresses: [{ id: "address-stored" }],
      cart: [persistedCartItem],
      favorites: ["product-attieke"],
      savedRecipes: ["recipe-garba"],
      savedOwnerId: customer.id,
      country: "Belgique",
      postalCode: "1000",
    }, useStore.getState());

    useStore.setState(merged);

    expect(useStore.getState().customer).toBeNull();
    expect(useStore.getState().addresses).toEqual([]);
    expect(useStore.getState().cart).toEqual([persistedCartItem]);
    expect(useStore.getState().addToCart(cartItem)).toBe(false);
    expect(useStore.getState().view).toBe("account");
    expect(useStore.getState().authReturnTarget).toEqual({ view: "home", params: {} });
  });
});

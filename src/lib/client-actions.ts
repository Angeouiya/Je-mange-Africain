const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export function downloadOrderInvoice(order: Record<string, any>, locale: "fr" | "en") {
  const items = Array.isArray(order.items) ? order.items : [];
  const currency = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" });
  const rows = items.map((item: Record<string, any>) => {
    const name = item.name || (locale === "fr" ? item.nameFr : item.nameEn) || item.nameFr || item.nameEn || "Produit";
    const total = Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.qty || 0));
    return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(item.qty || 1)}</td><td>${escapeHtml(currency.format(total))}</td></tr>`;
  }).join("");
  const html = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${escapeHtml(order.number || "Facture")}</title><style>body{font:14px Arial,sans-serif;color:#242424;max-width:760px;margin:40px auto;padding:0 24px}header{border-bottom:3px solid #d65a32;padding-bottom:18px}h1{margin:0;font-size:28px}small{color:#666}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}.total{font-size:20px;font-weight:700;color:#d65a32;text-align:right;margin-top:22px}</style><body><header><h1>Je mange Africain</h1><small>${locale === "fr" ? "Facture" : "Invoice"} ${escapeHtml(order.number || "")}</small></header><p>${locale === "fr" ? "Date" : "Date"} : ${escapeHtml(new Date(order.createdAt || Date.now()).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB"))}</p><table><thead><tr><th>${locale === "fr" ? "Produit" : "Product"}</th><th>${locale === "fr" ? "Quantité" : "Quantity"}</th><th>${locale === "fr" ? "Montant" : "Amount"}</th></tr></thead><tbody>${rows}</tbody></table><p class="total">${locale === "fr" ? "Total" : "Total"} : ${escapeHtml(currency.format(Number(order.total || 0)))}</p></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(order.number || "facture").replace(/[^a-zA-Z0-9_-]/g, "-")}.html`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareRecipe(title: string, recipeId: string) {
  const url = `${window.location.origin}/?view=recipe-config&recipeId=${encodeURIComponent(recipeId)}`;
  if (navigator.share) {
    await navigator.share({ title, text: title, url });
    return;
  }
  await navigator.clipboard.writeText(url);
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export function downloadOrderInvoice(order: Record<string, any>, locale: "fr" | "en") {
  const isFr = locale === "fr";
  const items = Array.isArray(order.items) ? order.items : [];
  const language = isFr ? "fr-FR" : "en-GB";
  const currency = new Intl.NumberFormat(language, { style: "currency", currency: "EUR" });
  const formatMoney = (value: unknown) => currency.format(Number(value || 0));
  const company = {
    name: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Je mange Africain",
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
    registration: process.env.NEXT_PUBLIC_COMPANY_REGISTRATION || "",
    vat: process.env.NEXT_PUBLIC_COMPANY_VAT_NUMBER || "",
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com",
  };
  const companyDetails = [
    company.address,
    company.registration ? `${isFr ? "Immatriculation" : "Registration"}: ${company.registration}` : "",
    company.vat ? `${isFr ? "N° TVA" : "VAT no."}: ${company.vat}` : "",
    company.email,
    "je-mange-africain.com",
  ].filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const deliveryDetails = [
    order.deliveryName,
    order.deliveryAddress,
    [order.deliveryPostalCode, order.deliveryCity].filter(Boolean).join(" "),
    order.deliveryCountry,
  ].filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const rows = items.map((item: Record<string, any>) => {
    const name = item.name || (isFr ? item.nameFr : item.nameEn) || item.nameFr || item.nameEn || (isFr ? "Produit" : "Product");
    const quantity = Number(item.qty || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const total = Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.qty || 0));
    return `<tr><td><strong>${escapeHtml(name)}</strong>${item.sku ? `<small>SKU ${escapeHtml(item.sku)}</small>` : ""}</td><td class="number">${escapeHtml(quantity)}</td><td class="number">${escapeHtml(formatMoney(unitPrice))}</td><td class="number"><strong>${escapeHtml(formatMoney(total))}</strong></td></tr>`;
  }).join("");
  const payment = Array.isArray(order.payments) ? order.payments[0] : null;
  const reference = payment?.reference || order.paymentReference || "";
  const paymentMethod = payment?.method || order.paymentMethod || "";
  const summaryEntries: Array<[string, number]> = [
    [isFr ? "Sous-total produits" : "Products subtotal", Number(order.subtotal || 0)],
    [isFr ? "Livraison" : "Delivery", Number(order.shippingCost || 0)],
    [isFr ? "Dont TVA incluse" : "Including VAT", Number(order.vatAmount || 0)],
  ];
  if (Number(order.promoDiscount || 0) > 0) {
    summaryEntries.splice(1, 0, [isFr ? "Remise" : "Discount", -Number(order.promoDiscount)]);
  }
  const summaryRows = summaryEntries.map(([label, value]) => `<div class="summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatMoney(value))}</strong></div>`).join("");
  const invoiceNumber = order.number || (isFr ? "Facture" : "Invoice");
  const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" });
  const logoUrl = `${window.location.origin}/logo-jma.png`;
  const html = `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(isFr ? "Facture" : "Invoice")} ${escapeHtml(invoiceNumber)}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f3f1ed;color:#25231f;font:13px Arial,sans-serif;line-height:1.5}.page{width:min(900px,100%);margin:24px auto;background:#fff;padding:42px}.brand{display:flex;align-items:center;gap:16px}.brand img{width:82px;height:82px;object-fit:contain}.brand h1{margin:0;font-size:20px}.brand p,.meta p{margin:2px 0;color:#68645e}.header{display:flex;justify-content:space-between;gap:32px;padding-bottom:24px;border-bottom:3px solid #d25b32}.meta{text-align:right}.meta strong{display:block;color:#d25b32;font-size:22px}.addresses{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}.address{border-top:1px solid #ddd8cf;padding-top:12px}.label{margin-bottom:7px;color:#77716a;font-size:10px;font-weight:700;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{background:#2e342c;color:#fff;font-size:10px;text-transform:uppercase}th,td{padding:11px 10px;text-align:left;border-bottom:1px solid #e5e1db}td small{display:block;color:#77716a}.number{text-align:right;white-space:nowrap}.summary{width:min(360px,100%);margin:24px 0 0 auto}.summary-row{display:flex;justify-content:space-between;gap:24px;padding:6px 0}.grand-total{margin-top:7px;padding:13px 0;border-top:2px solid #2e342c;border-bottom:2px solid #2e342c;color:#d25b32;font-size:18px}.payment{margin-top:28px;padding:14px;background:#f5f3ef}.payment strong{color:#2e342c}.footer{margin-top:36px;padding-top:18px;border-top:1px solid #ddd8cf;color:#77716a;font-size:10px;text-align:center}@media(max-width:620px){.page{margin:0;padding:24px 18px}.header,.addresses{display:block}.meta{margin-top:22px;text-align:left}.address+.address{margin-top:20px}th:nth-child(3),td:nth-child(3){display:none}}@media print{body{background:#fff}.page{margin:0;width:100%;padding:20px}}
  </style>
</head>
<body><main class="page">
  <header class="header">
    <div class="brand"><img src="${escapeHtml(logoUrl)}" alt="Je mange Africain"><div><h1>${escapeHtml(company.name)}</h1>${companyDetails}</div></div>
    <div class="meta"><strong>${escapeHtml(isFr ? "FACTURE" : "INVOICE")}</strong><p>N° ${escapeHtml(invoiceNumber)}</p><p>${escapeHtml(isFr ? "Date d'émission" : "Issue date")}: ${escapeHtml(invoiceDate)}</p></div>
  </header>
  <section class="addresses">
    <div class="address"><div class="label">${escapeHtml(isFr ? "Émetteur" : "Seller")}</div><strong>${escapeHtml(company.name)}</strong>${companyDetails}</div>
    <div class="address"><div class="label">${escapeHtml(isFr ? "Facturé et livré à" : "Billed and delivered to")}</div>${deliveryDetails || `<div>${escapeHtml(isFr ? "Coordonnées associées à la commande" : "Details linked to the order")}</div>`}</div>
  </section>
  <table><thead><tr><th>${escapeHtml(isFr ? "Désignation" : "Item")}</th><th class="number">${escapeHtml(isFr ? "Qté" : "Qty")}</th><th class="number">${escapeHtml(isFr ? "Prix unitaire" : "Unit price")}</th><th class="number">${escapeHtml(isFr ? "Montant" : "Amount")}</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="summary">${summaryRows}<div class="summary-row grand-total"><span>${escapeHtml(isFr ? "Total TTC" : "Total incl. tax")}</span><strong>${escapeHtml(formatMoney(order.total))}</strong></div></section>
  <section class="payment"><strong>${escapeHtml(isFr ? "Paiement" : "Payment")}</strong><div>${escapeHtml(paymentMethod || (isFr ? "Mode enregistré avec la commande" : "Method recorded with the order"))}${reference ? ` · ${escapeHtml(isFr ? "Référence" : "Reference")} ${escapeHtml(reference)}` : ""}</div>${order.deliverySlot ? `<div>${escapeHtml(isFr ? "Créneau de livraison" : "Delivery slot")}: ${escapeHtml(order.deliverySlot)}</div>` : ""}</section>
  <footer class="footer">${escapeHtml(isFr ? "Merci pour votre confiance. Conservez cette facture comme justificatif d'achat." : "Thank you for your trust. Keep this invoice as proof of purchase.")}</footer>
</main></body></html>`;
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

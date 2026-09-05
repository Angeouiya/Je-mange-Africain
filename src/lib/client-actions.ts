import { paymentMethodLabel } from "@/lib/payment-methods";
import { europeanCountryLabel } from "@/lib/european-countries";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

type InvoiceCompany = {
  name: string;
  address: string;
  legalFormCapital: string;
  registration: string;
  vat: string;
  email: string;
  phone: string;
  paymentTerms: string;
  earlyPaymentTerms: string;
  latePaymentTerms: string;
  collectionFee: string;
};

type InvoiceOptions = {
  baseUrl: string;
  company?: Partial<InvoiceCompany>;
};

const absoluteAssetUrl = (value: unknown, baseUrl: string) => {
  if (!value) return "";
  try {
    const url = new URL(String(value), baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const finiteNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const invoiceDate = (value: unknown, language: string) => {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" });
};

const shipmentStatusLabel = (value: unknown, isFr: boolean) => {
  const labels: Record<string, [string, string]> = {
    preparing: ["En préparation", "Preparing"],
    packed: ["Colis prêt", "Parcel ready"],
    shipped: ["Remis au transporteur", "Handed to carrier"],
    in_transit: ["En transit", "In transit"],
    out_for_delivery: ["En cours de livraison", "Out for delivery"],
    delivered: ["Livré", "Delivered"],
  };
  const key = String(value || "").trim().toLowerCase();
  return labels[key]?.[isFr ? 0 : 1] || String(value || (isFr ? "Suivi en préparation" : "Tracking is being prepared")).replaceAll("_", " ");
};

const thermalClassLabel = (value: unknown, isFr: boolean) => {
  const labels: Record<string, [string, string]> = {
    AMBIENT: ["Ambiant", "Ambient"],
    REFRIGERATED: ["Réfrigéré", "Chilled"],
    FROZEN: ["Surgelé", "Frozen"],
  };
  const key = String(value || "").trim().toUpperCase();
  return labels[key]?.[isFr ? 0 : 1] || String(value || "").replaceAll("_", " ");
};

export function buildOrderInvoiceHtml(order: Record<string, any>, locale: "fr" | "en", options: InvoiceOptions) {
  const isFr = locale === "fr";
  const items = Array.isArray(order.items) ? order.items : [];
  const shipments = Array.isArray(order.shipments) ? order.shipments : [];
  const language = isFr ? "fr-FR" : "en-GB";
  const currencyCode = /^[A-Z]{3}$/.test(String(order.currency || "").toUpperCase()) ? String(order.currency).toUpperCase() : "EUR";
  const currency = new Intl.NumberFormat(language, { style: "currency", currency: currencyCode });
  const formatMoney = (value: unknown) => currency.format(finiteNumber(value));
  const company: InvoiceCompany = {
    name: options.company?.name || "Je mange Africain",
    address: options.company?.address || "",
    legalFormCapital: options.company?.legalFormCapital || "",
    registration: options.company?.registration || "",
    vat: options.company?.vat || "",
    email: options.company?.email || "bonjour@je-mange-africain.com",
    phone: options.company?.phone || "",
    paymentTerms: options.company?.paymentTerms || "",
    earlyPaymentTerms: options.company?.earlyPaymentTerms || "",
    latePaymentTerms: options.company?.latePaymentTerms || "",
    collectionFee: options.company?.collectionFee || "",
  };
  const sellerDetails = [
    company.legalFormCapital,
    company.registration ? `${isFr ? "Immatriculation" : "Registration"}: ${company.registration}` : "",
    company.vat ? `${isFr ? "N° TVA" : "VAT no."}: ${company.vat}` : "",
    company.address,
    company.email,
    company.phone,
  ].filter(Boolean).map((line) => `<span>${escapeHtml(line)}</span>`).join("");
  const addressBlock = (prefix: "billing" | "delivery") => {
    const fallback = prefix === "billing";
    const lines = [
      order[`${prefix}Name`] || (fallback ? order.deliveryName : ""),
      order[`${prefix}Address`] || (fallback ? order.deliveryAddress : ""),
      [order[`${prefix}PostalCode`] || (fallback ? order.deliveryPostalCode : ""), order[`${prefix}City`] || (fallback ? order.deliveryCity : "")].filter(Boolean).join(" "),
      europeanCountryLabel(order[`${prefix}Country`] || (fallback ? order.deliveryCountry : ""), isFr ? "fr" : "en"),
      fallback ? order.customerEmail : "",
      fallback ? order.customerPhone : "",
    ].filter(Boolean);
    return lines.map((line, index) => index === 0 ? `<strong>${escapeHtml(line)}</strong>` : `<span>${escapeHtml(line)}</span>`).join("");
  };
  const billingDetails = addressBlock("billing");
  const deliveryDetails = [
    order.deliveryName,
    order.deliveryAddress,
    [order.deliveryPostalCode, order.deliveryCity].filter(Boolean).join(" "),
    europeanCountryLabel(order.deliveryCountry, isFr ? "fr" : "en"),
  ].filter(Boolean).map((line, index) => index === 0 ? `<strong>${escapeHtml(line)}</strong>` : `<span>${escapeHtml(line)}</span>`).join("");
  const defaultVatRate = Math.min(100, Math.max(0, finiteNumber(order.vatRate, 20)));
  const rows = items.map((item: Record<string, any>) => {
    const name = (isFr ? item.nameFr : item.nameEn) || item.name || item.nameFr || item.nameEn || (isFr ? "Produit" : "Product");
    const quantity = Math.max(1, finiteNumber(item.qty, 1));
    const unitPrice = finiteNumber(item.unitPrice);
    const total = finiteNumber(item.lineTotal, unitPrice * quantity);
    const vatRate = Math.min(100, Math.max(0, finiteNumber(item.vatRate, defaultVatRate)));
    const taxFactor = 1 + vatRate / 100;
    const unitPriceExTax = finiteNumber(item.unitPriceExTax, unitPrice / taxFactor);
    const lineTotalExTax = finiteNumber(item.lineTotalExTax, total / taxFactor);
    const imageUrl = absoluteAssetUrl(item.imageUrl, options.baseUrl);
    const channel = item.salesChannel === "wholesale" ? (isFr ? "Marché de gros" : "Wholesale market") : "";
    const recipeName = (isFr ? item.recipeNameFr : item.recipeNameEn) || item.recipeName || "";
    const detail = [channel, item.variantLabel || item.unitLabel, item.sku ? `SKU ${item.sku}` : "", recipeName].filter(Boolean).join(" · ");
    return `<tr><td class="product-cell"><div class="item">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : ""}<div><strong>${escapeHtml(name)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div></div></td><td class="number" data-label="${escapeHtml(isFr ? "Quantité" : "Quantity")}">${escapeHtml(quantity)}</td><td class="number" data-label="${escapeHtml(isFr ? "Prix unit. HT" : "Unit ex. tax")}">${escapeHtml(formatMoney(unitPriceExTax))}</td><td class="number" data-label="${escapeHtml(isFr ? "TVA" : "VAT")}">${escapeHtml(`${vatRate.toLocaleString(language)} %`)}</td><td class="number line-total" data-label="${escapeHtml(isFr ? "Montant HT" : "Ex. tax total")}"><strong>${escapeHtml(formatMoney(lineTotalExTax))}</strong></td></tr>`;
  }).join("");
  const payment = Array.isArray(order.payments) ? order.payments[0] : null;
  const reference = payment?.reference || order.paymentReference || "";
  const paymentMethod = paymentMethodLabel(payment?.method || order.paymentMethod, isFr ? "fr" : "en");
  const paymentStatus = String(payment?.status || "").toLowerCase();
  const paymentStatusLabel = ["captured", "paid", "succeeded"].includes(paymentStatus)
    ? (isFr ? "Payée" : "Paid")
    : paymentStatus === "refunded"
      ? (isFr ? "Remboursée" : "Refunded")
      : paymentStatus === "failed"
        ? (isFr ? "Échec du paiement" : "Payment failed")
        : (isFr ? "Statut enregistré avec la commande" : "Status recorded with the order");
  const deliveryServiceLabel = ({
    standard: isFr ? "Livraison standard" : "Standard delivery",
    express: isFr ? "Livraison express" : "Express delivery",
    relay: isFr ? "Point relais" : "Collection point",
  } as Record<string, string>)[String(order.deliverySlot || "")] || order.deliverySlot || "";
  const total = finiteNumber(order.total);
  const vatAmount = finiteNumber(order.vatAmount);
  const totalExTax = Math.max(0, total - vatAmount);
  const commercialEntries: Array<[string, number, string?]> = [
    [isFr ? "Sous-total produits TTC" : "Products subtotal incl. tax", finiteNumber(order.subtotal)],
    [isFr ? "Livraison TTC" : "Delivery incl. tax", finiteNumber(order.shippingCost)],
  ];
  if (finiteNumber(order.promoDiscount) > 0) {
    commercialEntries.splice(1, 0, [isFr ? "Remise" : "Discount", -finiteNumber(order.promoDiscount), "discount"]);
  }
  const commercialRows = commercialEntries.map(([label, value, tone]) => `<div class="summary-row${tone ? ` ${tone}` : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatMoney(value))}</strong></div>`).join("");
  const invoiceNumber = order.invoiceNumber || order.number || (isFr ? "Facture" : "Invoice");
  const issueDate = invoiceDate(order.invoicedAt || order.createdAt, language) || invoiceDate(Date.now(), language);
  const saleDate = invoiceDate(order.saleDate || order.createdAt, language) || issueDate;
  const paymentDate = invoiceDate(payment?.createdAt || order.paidAt, language);
  const paymentDue = company.paymentTerms || (["captured", "paid", "succeeded"].includes(paymentStatus)
    ? `${isFr ? "Réglée" : "Settled"}${paymentDate ? ` ${isFr ? "le" : "on"} ${paymentDate}` : ""}`
    : (isFr ? "Paiement à réception" : "Payment due on receipt"));
  const logoUrl = absoluteAssetUrl("/brand/logo-mark-burgundy.png", options.baseUrl);
  const primaryShipment = shipments[0] || null;
  const carrier = primaryShipment?.carrierName || primaryShipment?.carrier || order.carrier || "";
  const trackingNumber = primaryShipment?.trackingNumber || order.trackingNumber || "";
  const estimatedDelivery = invoiceDate(primaryShipment?.estimatedDelivery || order.estimatedDelivery, language);
  const actualDelivery = invoiceDate(primaryShipment?.actualDelivery || order.actualDelivery, language);
  const packageCount = Math.max(1, finiteNumber(order.packageCount, shipments.length || 1));
  const weightGrams = Math.max(0, finiteNumber(order.weightGrams));
  const weightLabel = weightGrams >= 1000
    ? `${(weightGrams / 1000).toLocaleString(language, { maximumFractionDigits: 2 })} kg`
    : weightGrams > 0 ? `${weightGrams.toLocaleString(language)} g` : "";
  const legalTerms = [
    company.earlyPaymentTerms ? `<p><strong>${escapeHtml(isFr ? "Escompte" : "Early payment")}</strong>${escapeHtml(company.earlyPaymentTerms)}</p>` : "",
    company.latePaymentTerms ? `<p><strong>${escapeHtml(isFr ? "Retard de paiement" : "Late payment")}</strong>${escapeHtml(company.latePaymentTerms)}</p>` : "",
    company.collectionFee ? `<p><strong>${escapeHtml(isFr ? "Indemnité de recouvrement" : "Collection fee")}</strong>${escapeHtml(company.collectionFee)}</p>` : "",
  ].filter(Boolean).join("");
  const shipmentFacts = [
    carrier ? [isFr ? "Transporteur" : "Carrier", carrier] : null,
    trackingNumber ? [isFr ? "N° de suivi" : "Tracking no.", trackingNumber] : null,
    [isFr ? "Colis" : "Parcels", `${packageCount}`],
    weightLabel ? [isFr ? "Poids total" : "Total weight", weightLabel] : null,
    primaryShipment?.thermalClass ? [isFr ? "Conservation" : "Temperature", thermalClassLabel(primaryShipment.thermalClass, isFr)] : null,
    actualDelivery ? [isFr ? "Livrée le" : "Delivered on", actualDelivery] : estimatedDelivery ? [isFr ? "Livraison estimée" : "Estimated delivery", estimatedDelivery] : null,
    primaryShipment?.status ? [isFr ? "Statut du colis" : "Parcel status", shipmentStatusLabel(primaryShipment.status, isFr)] : null,
  ].filter((fact): fact is string[] => Boolean(fact));
  const shipmentRows = shipmentFacts.map(([label, value]) => `<div class="fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="${escapeHtml(logoUrl)}">
  <title>${escapeHtml(isFr ? "Facture" : "Invoice")} ${escapeHtml(invoiceNumber)}</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}html{background:#f8f2ef}body{margin:0;background:#f8f2ef;color:#4d2c35;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;line-height:1.5;letter-spacing:0}.toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;width:min(920px,100%);margin:0 auto;padding:12px 18px;background:rgba(255,255,255,.96);border-bottom:1px solid #eadbd6}.toolbar strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8a3042}.toolbar button{min-height:40px;padding:0 16px;border:1px solid #8a3042;border-radius:6px;background:#8a3042;color:#fff;font:inherit;font-weight:800;cursor:pointer}.toolbar button:hover{background:#6f2133}.page{width:min(900px,100%);margin:20px auto 40px;background:#fff;padding:42px 46px;box-shadow:0 18px 60px rgba(99,42,54,.1)}.header{display:flex;align-items:flex-start;justify-content:space-between;gap:32px;padding-bottom:26px;border-bottom:3px solid #d65a32}.brand{display:flex;min-width:0;align-items:center;gap:15px}.brand img{width:82px;height:82px;flex:0 0 82px;object-fit:contain}.brand h1{margin:0;color:#8a3042;font-size:21px;line-height:1.15}.brand p{margin:5px 0 0;color:#7b6067;font-size:11px}.meta{min-width:225px;text-align:right}.status{display:inline-flex;align-items:center;min-height:26px;margin-bottom:8px;padding:0 9px;border:1px solid #e6c0af;border-radius:999px;background:#fff6ef;color:#a63f2d;font-size:9px;font-weight:900;text-transform:uppercase}.document-title{display:block;color:#8a3042;font-size:25px;line-height:1}.meta dl{display:grid;grid-template-columns:auto auto;justify-content:end;gap:2px 12px;margin:11px 0 0;color:#725a61;font-size:10px}.meta dt{font-weight:600}.meta dd{margin:0;font-weight:800;color:#4d2c35}.identity-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:26px 0}.identity{min-width:0;padding:15px 16px;border:1px solid #eadbd6;border-radius:7px;background:#fff}.label{margin:0 0 9px;color:#a8432e;font-size:9px;font-weight:900;text-transform:uppercase}.identity span,.identity strong,.identity-address span,.identity-address strong{display:block;overflow-wrap:anywhere}.identity strong,.identity-address strong{margin-bottom:2px;color:#4d2c35}.identity span,.identity-address span{color:#725f64}.identity-address{margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f0e4e0}.section-title{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:28px 0 10px}.section-title h2{margin:0;color:#4d2c35;font-size:15px}.section-title span{color:#806b70;font-size:9px;text-transform:uppercase}table{width:100%;border-collapse:collapse;table-layout:fixed}th{padding:9px 8px;background:#8a3042;color:#fff;font-size:8px;font-weight:900;text-align:left;text-transform:uppercase}th:first-child{width:43%}th:nth-child(2){width:9%}th:nth-child(3){width:17%}th:nth-child(4){width:11%}th:nth-child(5){width:20%}td{padding:12px 8px;border-bottom:1px solid #eadbd6;vertical-align:middle}.item{display:flex;min-width:0;align-items:center;gap:11px}.item img{width:46px;height:46px;flex:0 0 46px;border-radius:6px;background:#fff8f4;object-fit:cover}.item div{min-width:0}.item strong{display:block;overflow-wrap:anywhere;line-height:1.35}.item small{display:block;margin-top:3px;color:#806b70;font-size:9px;overflow-wrap:anywhere}.number{text-align:right;white-space:nowrap}.totals{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,340px);gap:24px;margin-top:24px}.tax-note{align-self:start;padding:14px 16px;border-left:3px solid #f2aa25;background:#fff9f1;color:#765f65;font-size:10px}.tax-note strong{display:block;margin-bottom:3px;color:#8a3042;font-size:11px}.summary-row{display:flex;justify-content:space-between;gap:24px;padding:5px 0}.summary-row strong{white-space:nowrap}.summary-row.discount{color:#a8432e}.tax-breakdown{margin-top:8px;padding-top:9px;border-top:1px solid #dfcbc5}.grand-total{margin-top:8px;padding:12px 0;border-top:2px solid #8a3042;border-bottom:2px solid #8a3042;color:#a8432e;font-size:18px}.operations{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:28px}.operation{min-width:0;padding:16px;border:1px solid #eadbd6;border-radius:7px}.operation h2{margin:0 0 11px;color:#8a3042;font-size:12px}.fact{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:12px;padding:6px 0;border-bottom:1px solid #f0e4e0}.fact:last-child{border-bottom:0}.fact dt{color:#806b70}.fact dd{margin:0;overflow-wrap:anywhere;text-align:right;font-weight:800;color:#4d2c35}.terms{margin-top:22px;padding-top:14px;border-top:1px solid #eadbd6;color:#806b70;font-size:9px}.terms p{margin:4px 0}.terms strong{display:inline-block;margin-right:5px;color:#4d2c35}.footer{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-top:30px;padding-top:17px;border-top:1px solid #eadbd6;color:#806b70;font-size:9px}.footer strong{display:block;color:#8a3042;font-size:10px}.footer-note{text-align:right}.footer-note span{display:block}.no-break{break-inside:avoid}@media(max-width:660px){html,body{background:#fff}.toolbar{padding:10px 14px}.toolbar button{padding:0 12px}.page{margin:0;padding:24px 16px;box-shadow:none}.header{display:block}.brand img{width:70px;height:70px;flex-basis:70px}.meta{min-width:0;margin-top:22px;text-align:left}.meta dl{justify-content:start}.identity-grid,.operations,.totals{grid-template-columns:1fr}.identity-grid{gap:10px}.section-title{align-items:flex-start}.section-title span{max-width:9rem;text-align:right}thead{display:none}table,tbody,tr,td{display:block;width:100%}tr{display:grid;grid-template-columns:1fr 1fr;padding:13px 0;border-bottom:1px solid #eadbd6}td{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;border:0;text-align:right}td::before{content:attr(data-label);color:#806b70;font-size:9px;font-weight:700;text-transform:uppercase}.product-cell{grid-column:1/-1;padding:0 0 9px;text-align:left}.product-cell::before{display:none}.line-total{margin-top:3px;padding-top:8px;border-top:1px dashed #eadbd6}.totals{gap:14px}.tax-note{order:2}.operations{gap:10px}.footer{display:block}.footer-note{margin-top:10px;text-align:left}}@media print{@page{size:A4;margin:12mm}html,body{background:#fff}.toolbar{display:none}.page{width:100%;margin:0;padding:0;box-shadow:none}.identity,.operation{background:#fff}.header,.identity-grid,.totals,.operations,.footer,tr{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    .operations{align-items:start}@media(max-width:660px){tbody td:not(.product-cell){display:block;text-align:left}tbody td:not(.product-cell)::before{display:block;margin-bottom:2px}}
  </style>
</head>
<body>
<div class="toolbar" role="toolbar" aria-label="${escapeHtml(isFr ? "Actions de la facture" : "Invoice actions")}"><strong>${escapeHtml(isFr ? "Facture" : "Invoice")} ${escapeHtml(invoiceNumber)}</strong><button type="button" onclick="window.print()">${escapeHtml(isFr ? "Imprimer / PDF" : "Print / PDF")}</button></div>
<main class="page" data-company-profile="${company.address && company.registration ? "complete" : "incomplete"}">
  <header class="header">
    <div class="brand"><img src="${escapeHtml(logoUrl)}" alt="Je mange Africain"><div><h1>${escapeHtml(company.name)}</h1><p>${escapeHtml(isFr ? "Saveurs africaines, livrées avec soin" : "African flavours, delivered with care")}</p></div></div>
    <div class="meta"><span class="status">${escapeHtml(paymentStatusLabel)}</span><strong class="document-title">${escapeHtml(isFr ? "FACTURE" : "INVOICE")}</strong><dl><dt>${escapeHtml(isFr ? "Numéro" : "Number")}</dt><dd>${escapeHtml(invoiceNumber)}</dd><dt>${escapeHtml(isFr ? "Émission" : "Issued")}</dt><dd>${escapeHtml(issueDate)}</dd><dt>${escapeHtml(isFr ? "Vente" : "Sale")}</dt><dd>${escapeHtml(saleDate)}</dd><dt>${escapeHtml(isFr ? "Devise" : "Currency")}</dt><dd>${escapeHtml(currencyCode)}</dd><dt>${escapeHtml(isFr ? "Opération" : "Supply")}</dt><dd>${escapeHtml(isFr ? "Livraison de biens" : "Supply of goods")}</dd></dl></div>
  </header>
  <section class="identity-grid no-break">
    <div class="identity"><p class="label">${escapeHtml(isFr ? "Vendeur" : "Seller")}</p><strong>${escapeHtml(company.name)}</strong>${sellerDetails}</div>
    <div class="identity"><p class="label">${escapeHtml(isFr ? "Client facturé" : "Billed customer")}</p>${billingDetails || `<span>${escapeHtml(isFr ? "Coordonnées associées à la commande" : "Details linked to the order")}</span>`}</div>
  </section>
  <div class="section-title"><h2>${escapeHtml(isFr ? "Détail de la commande" : "Order details")}</h2><span>${escapeHtml(order.number ? `${isFr ? "Commande" : "Order"} ${order.number}` : "")}</span></div>
  <table aria-label="${escapeHtml(isFr ? "Articles facturés" : "Invoiced items")}"><thead><tr><th>${escapeHtml(isFr ? "Désignation" : "Item")}</th><th class="number">${escapeHtml(isFr ? "Qté" : "Qty")}</th><th class="number">${escapeHtml(isFr ? "Prix unit. HT" : "Unit ex. tax")}</th><th class="number">${escapeHtml(isFr ? "TVA" : "VAT")}</th><th class="number">${escapeHtml(isFr ? "Montant HT" : "Ex. tax total")}</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="totals no-break"><div class="tax-note"><strong>${escapeHtml(isFr ? "Prix clairs, taxes comprises" : "Clear prices, taxes included")}</strong>${escapeHtml(isFr ? "Les prix affichés lors de la commande sont TTC. Le détail ci-contre isole la base hors taxes et la TVA incluse." : "Prices shown at checkout include tax. The breakdown separates the tax-exclusive base and included VAT.")}</div><div class="summary">${commercialRows}<div class="tax-breakdown"><div class="summary-row"><span>${escapeHtml(isFr ? "Total HT" : "Total ex. tax")}</span><strong>${escapeHtml(formatMoney(totalExTax))}</strong></div><div class="summary-row"><span>${escapeHtml(isFr ? "TVA incluse" : "VAT included")}</span><strong>${escapeHtml(formatMoney(vatAmount))}</strong></div></div><div class="summary-row grand-total"><span>${escapeHtml(isFr ? "Total TTC" : "Total incl. tax")}</span><strong>${escapeHtml(formatMoney(total))}</strong></div></div></section>
  <section class="operations no-break">
    <div class="operation"><h2>${escapeHtml(isFr ? "Paiement" : "Payment")}</h2><dl><div class="fact"><dt>${escapeHtml(isFr ? "Statut" : "Status")}</dt><dd>${escapeHtml(paymentStatusLabel)}</dd></div><div class="fact"><dt>${escapeHtml(isFr ? "Mode" : "Method")}</dt><dd>${escapeHtml(paymentMethod)}</dd></div>${reference ? `<div class="fact"><dt>${escapeHtml(isFr ? "Référence" : "Reference")}</dt><dd>${escapeHtml(reference)}</dd></div>` : ""}<div class="fact"><dt>${escapeHtml(isFr ? "Échéance" : "Due")}</dt><dd>${escapeHtml(paymentDue)}</dd></div></dl></div>
    <div class="operation"><h2>${escapeHtml(isFr ? "Livraison" : "Delivery")}</h2>${deliveryDetails ? `<div class="identity-address">${deliveryDetails}</div>` : ""}<dl>${deliveryServiceLabel ? `<div class="fact"><dt>${escapeHtml(isFr ? "Service" : "Service")}</dt><dd>${escapeHtml(deliveryServiceLabel)}</dd></div>` : ""}${shipmentRows}</dl></div>
  </section>
  ${legalTerms ? `<section class="terms no-break">${legalTerms}</section>` : ""}
  <footer class="footer"><div><strong>${escapeHtml(company.name)}</strong><span>je-mange-africain.com</span></div><div class="footer-note"><span>${escapeHtml(isFr ? "Merci pour votre confiance." : "Thank you for your trust.")}</span><span>${escapeHtml(isFr ? "Conservez ce document comme justificatif d'achat." : "Keep this document as proof of purchase.")}</span></div></footer>
</main></body></html>`;
}

export function downloadOrderInvoice(order: Record<string, any>, locale: "fr" | "en") {
  const html = buildOrderInvoiceHtml(order, locale, {
    baseUrl: window.location.origin,
    company: {
      name: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Je mange Africain",
      address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
      legalFormCapital: process.env.NEXT_PUBLIC_COMPANY_LEGAL_FORM_CAPITAL || "",
      registration: process.env.NEXT_PUBLIC_COMPANY_REGISTRATION || "",
      vat: process.env.NEXT_PUBLIC_COMPANY_VAT_NUMBER || "",
      email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com",
      phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
      paymentTerms: process.env.NEXT_PUBLIC_COMPANY_PAYMENT_TERMS || "",
      earlyPaymentTerms: process.env.NEXT_PUBLIC_COMPANY_EARLY_PAYMENT_TERMS || "",
      latePaymentTerms: process.env.NEXT_PUBLIC_COMPANY_LATE_PAYMENT_TERMS || "",
      collectionFee: process.env.NEXT_PUBLIC_COMPANY_COLLECTION_FEE || "",
    },
  });
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

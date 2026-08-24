"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ChefHat, Boxes, Truck, ShoppingCart, Users,
  CreditCard, ScrollText, Settings, Menu, X, Store, AlertTriangle,
  TrendingUp, Clock, DollarSign, PackageCheck, Snowflake, FileText, ShieldCheck,
  LogOut, BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatDate, orderStatusColor, thermalColor, thermalLabel } from "@/lib/format";
import { ProductCreateDialog } from "@/components/admin/ProductCreateDialog";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { PushCampaignAdmin } from "@/components/admin/PushCampaignAdmin";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AdminSection =
  | "dashboard" | "products" | "recipes" | "stock" | "orders"
  | "customers" | "payments" | "notifications" | "audit" | "settings";

export function AdminView({
  adminEmail = "",
  adminRole = "",
  onLogout,
}: {
  adminEmail?: string;
  adminRole?: string;
  onLogout?: () => void;
}) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale].admin;
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const backToStore = () => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      window.location.assign("https://je-mange-africain.com");
      return;
    }
    navigate("home");
  };

  const nav: { id: AdminSection; icon: any; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: t.dashboard },
    { id: "products", icon: Package, label: t.products },
    { id: "recipes", icon: ChefHat, label: t.recipes },
    { id: "stock", icon: Boxes, label: t.stock },
    { id: "orders", icon: ShoppingCart, label: t.orders },
    { id: "customers", icon: Users, label: t.customers },
    { id: "payments", icon: CreditCard, label: t.payments },
    { id: "notifications", icon: BellRing, label: locale === "fr" ? "Notifications" : "Notifications" },
    { id: "audit", icon: ScrollText, label: t.audit },
    { id: "settings", icon: Settings, label: t.settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#F6F7F2]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-charcoal text-cream transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="african-kente-stripe h-1.5" />
        <div className="flex items-center justify-between p-4">
          <BrandLockup context="admin" compact inverse />
          <button onClick={() => setSidebarOpen(false)} className="md:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => { setSection(n.id); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                section === n.id ? "bg-terre text-cream" : "text-cream/80 hover:bg-cream/10"
              }`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-cream/10 p-3">
          <Button onClick={backToStore} variant="ghost" className="w-full justify-start text-cream/70 hover:bg-cream/10 hover:text-cream">
            <Store className="mr-2 h-4 w-4" /> {t.backToStore}
          </Button>
          <div className="mt-3 rounded-lg bg-cream/5 p-2 text-[11px] text-cream/60">
            <p className="truncate font-semibold text-cream/80">{adminEmail || "Session locale"}</p>
            <p className="truncate">{adminRole ? adminRole.replaceAll("_", " ") : "Console d'exploitation"}</p>
          </div>
          {onLogout ? (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" className="mt-1 w-full justify-start text-cream/70 hover:bg-cream/10 hover:text-cream"><LogOut className="mr-2 h-4 w-4" /> {locale === "fr" ? "Se déconnecter" : "Sign out"}</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{locale === "fr" ? "Fermer la session professionnelle ?" : "Close the professional session?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? "L'accès aux opérations, données clients et réglages sera immédiatement fermé sur cet appareil. Les modifications déjà enregistrées seront conservées." : "Access to operations, customer data and settings will close immediately on this device. Saved changes will remain."}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel><AlertDialogAction onClick={onLogout} className="bg-destructive text-white hover:bg-destructive/90">{locale === "fr" ? "Oui, me déconnecter" : "Yes, sign out"}</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-cream/95 px-4 py-3 backdrop-blur md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold text-charcoal">{nav.find((n) => n.id === section)?.label}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-forest/40 text-forest"><ShieldCheck className="mr-1 h-3 w-3" /> {locale === "fr" ? "Système opérationnel" : "System operational"}</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {section === "dashboard" && <Dashboard locale={locale} />}
              {section === "products" && <ProductsAdmin locale={locale} />}
              {section === "recipes" && <RecipesAdmin locale={locale} />}
              {section === "stock" && <StockAdmin locale={locale} />}
              {section === "orders" && <OrdersAdmin locale={locale} />}
              {section === "customers" && <CustomersAdmin locale={locale} />}
              {section === "payments" && <PaymentsAdmin locale={locale} />}
              {section === "notifications" && <PushCampaignAdmin locale={locale} />}
              {section === "audit" && <AuditAdmin locale={locale} />}
              {section === "settings" && <SettingsAdmin locale={locale} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ locale }: { locale: string }) {
  const t = dict[locale].admin;
  const kpis = [
    { label: t.kpiRevenueToday, value: formatPrice(2840, locale), delta: "+12%", icon: DollarSign, color: "#3F681C" },
    { label: t.kpiRevenueMonth, value: formatPrice(48200, locale), delta: "+8%", icon: TrendingUp, color: "#3F681C" },
    { label: t.kpiOrders, value: "142", delta: "+5%", icon: ShoppingCart, color: "#D65A32" },
    { label: t.kpiAvgBasket, value: formatPrice(34.8, locale), delta: "+3%", icon: PackageCheck, color: "#F2A900" },
    { label: t.kpiMargin, value: "38%", delta: "+1pt", icon: TrendingUp, color: "#3F681C" },
    { label: t.kpiLogisticsCost, value: formatPrice(3.2, locale), delta: "-2%", icon: Truck, color: "#D65A32" },
    { label: t.kpiToPrepare, value: "7", icon: Clock, color: "#F2A900" },
    { label: t.kpiLate, value: "1", icon: AlertTriangle, color: "#C0392B" },
    { label: t.kpiAtRisk, value: "0", icon: ShieldCheck, color: "#3F681C" },
    { label: t.kpiOutOfStock, value: "0", icon: X, color: "#C0392B" },
    { label: t.kpiExpiring, value: "2", icon: Snowflake, color: "#F2A900" },
    { label: t.kpiClaims, value: "1", icon: AlertTriangle, color: "#D65A32" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: k.color + "22" }}><k.icon className="h-4 w-4" style={{ color: k.color }} /></span>
              {k.delta && <span className={`text-[10px] font-semibold ${k.delta.startsWith("-") ? "text-red-600" : "text-forest"}`}>{k.delta}</span>}
            </div>
            <p className="mt-2 text-lg font-bold text-charcoal">{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-charcoal">{t.kpiTopProducts}</h3>
          <div className="space-y-2">
            {[
              { name: "Placali frais", qty: 184, revenue: 1270 },
              { name: "Attiéké", qty: 156, revenue: 702 },
              { name: "Graine de palme", qty: 142, revenue: 838 },
              { name: "Kplô fumé", qty: 98, revenue: 970 },
              { name: "Pâte d'arachide", qty: 87, revenue: 479 },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-charcoal">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.qty} {locale === "fr" ? "vendus" : "sold"}</span>
                <span className="w-16 text-right text-sm font-semibold text-terre">{formatPrice(p.revenue, locale)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-charcoal">{t.kpiTopRecipes}</h3>
          <div className="space-y-2">
            {[
              { name: "Placali sauce graine", views: 1240, conv: 18 },
              { name: "Attiéké-poisson", views: 980, conv: 22 },
              { name: "Sauce graine", views: 870, conv: 14 },
              { name: "Mafé", views: 640, conv: 16 },
              { name: "Sauce gombo", views: 510, conv: 12 },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-charcoal">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.views} {locale === "fr" ? "vues" : "views"}</span>
                <span className="w-12 text-right text-sm font-semibold text-forest">{r.conv}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold text-charcoal">{t.kpiConversion}</h3>
          <p className="text-3xl font-extrabold text-terre">3.8%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[38%] rounded-full bg-terre" /></div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold text-charcoal">{t.kpiTopCountries}</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span>France</span><span className="font-semibold">82%</span></div>
            <div className="flex justify-between"><span>Belgique</span><span className="font-semibold">9%</span></div>
            <div className="flex justify-between"><span>Luxembourg</span><span className="font-semibold">5%</span></div>
            <div className="flex justify-between"><span>Suisse</span><span className="font-semibold">4%</span></div>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold text-charcoal">{t.kpiCarriers}</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span>Chrono Frais</span><span className="font-semibold text-forest">98%</span></div>
            <div className="flex justify-between"><span>DPD Express</span><span className="font-semibold text-forest">94%</span></div>
            <div className="flex justify-between"><span>Flotte interne</span><span className="font-semibold text-forest">99%</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Products admin ---------------- */
function ProductsAdmin({ locale }: { locale: string }) {
  const { data, loading, refetch } = useFetch(`/api/catalog?locale=${locale}&pageSize=100`, [locale]);
  if (loading) return <SkeletonGrid />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} {locale === "fr" ? "produits" : "products"}</p>
        <ProductCreateDialog locale={locale} onCreated={refetch} />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{locale === "fr" ? "Produit" : "Product"}</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>{locale === "fr" ? "Prix" : "Price"}</TableHead>
              <TableHead>{locale === "fr" ? "Stock" : "Stock"}</TableHead>
              <TableHead>{locale === "fr" ? "Classe" : "Class"}</TableHead>
              <TableHead>{locale === "fr" ? "Statut" : "Status"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.products?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg text-lg" style={{ background: p.imageColor + "22" }}>{p.imageEmoji}</span>
                      <div><p className="text-sm font-medium text-charcoal">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.traditionalName}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-semibold text-terre">{formatPrice(p.promoPrice || p.price, locale)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={p.stockQty <= 0 ? "border-destructive/40 text-destructive" : p.stockQty <= (p.alertThreshold||5) ? "border-amber-400 text-amber-700" : "border-forest/40 text-forest"}>{p.stockQty}</Badge>
                  </TableCell>
                  <TableCell><span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${thermalColor(p.thermalClass)}`}>{thermalLabel(p.thermalClass, locale)}</span></TableCell>
                  <TableCell><Badge variant="outline" className="border-forest/40 text-forest">{locale === "fr" ? "Publié" : "Published"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Recipes admin ---------------- */
function RecipesAdmin({ locale }: { locale: string }) {
  const { data, loading } = useFetch(`/api/recipes?locale=${locale}`, [locale]);
  if (loading) return <SkeletonGrid />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.recipes?.length ?? 0} {locale === "fr" ? "recettes" : "recipes"}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.recipes?.map((r: any) => (
          <Card key={r.id} className="flex items-center gap-3 p-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: r.imageColor + "22" }}>{r.imageEmoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-charcoal">{r.title}</p>
              <p className="text-[11px] text-muted-foreground">{r.country} · {r.baseServings} {locale === "fr" ? "pers." : "serv."} · {r.ingredientCount} {locale === "fr" ? "ingrédients" : "ingredients"}</p>
            </div>
            {r.isPopular && <Badge className="bg-terre text-cream border-0">★</Badge>}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Stock admin (FEFO) ---------------- */
function StockAdmin({ locale }: { locale: string }) {
  const t = dict[locale].admin;
  const { data, loading } = useFetch(`/api/admin/stock?locale=${locale}`, [locale]);
  if (loading) return <SkeletonGrid />;
  const batches = data?.batches || [];
  const expiringSoon = batches.filter((b: any) => b.expiryDate && new Date(b.expiryDate).getTime() - Date.now() < 14 * 86400000);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">{locale === "fr" ? "Lots actifs" : "Active batches"}</p><p className="text-2xl font-bold text-charcoal">{batches.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">{t.kpiExpiring}</p><p className="text-2xl font-bold text-gold">{expiringSoon.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">{locale === "fr" ? "Entrepôts" : "Warehouses"}</p><p className="text-2xl font-bold text-forest">2</p></Card>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-forest/5 p-2 text-xs text-forest">
        <Snowflake className="h-4 w-4" /> {t.fefo}
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{locale === "fr" ? "Produit" : "Product"}</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>{locale === "fr" ? "Quantité" : "Quantity"}</TableHead>
              <TableHead>{locale === "fr" ? "Péremption" : "Expiry"}</TableHead>
              <TableHead>{locale === "fr" ? "Statut" : "Status"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {batches.slice(0, 25).map((b: any) => {
                const expiring = b.expiryDate && new Date(b.expiryDate).getTime() - Date.now() < 14 * 86400000;
                const expired = b.expiryDate && new Date(b.expiryDate) < new Date();
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm font-medium text-charcoal">{b.productName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.lotNumber}</TableCell>
                    <TableCell><Badge variant="outline">{b.quantity}</Badge></TableCell>
                    <TableCell className={expiring ? "font-medium text-gold" : expired ? "text-destructive" : ""}>{b.expiryDate ? formatDate(b.expiryDate, locale) : "—"}</TableCell>
                    <TableCell><Badge className={expired ? "bg-red-100 text-red-800 border-0" : expiring ? "bg-amber-100 text-amber-800 border-0" : "bg-green-100 text-green-800 border-0"}>{b.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Orders admin ---------------- */
function OrdersAdmin({ locale }: { locale: string }) {
  const { data, loading } = useFetch(`/api/orders?locale=${locale}`, [locale]);
  const t = dict[locale];
  if (loading) return <SkeletonGrid />;
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t.orders.number}</TableHead>
            <TableHead>{t.orders.date}</TableHead>
            <TableHead>{t.orders.status}</TableHead>
            <TableHead>{t.orders.items}</TableHead>
            <TableHead>{t.orders.total}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.orders?.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-semibold text-terre">{o.number}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt, locale)}</TableCell>
                <TableCell><Badge className={`border ${orderStatusColor(o.status)}`}>{t.orders.statuses[o.status as keyof typeof t.orders.statuses] || o.status}</Badge></TableCell>
                <TableCell>{o.items.length}</TableCell>
                <TableCell className="font-semibold">{formatPrice(o.total, locale)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ---------------- Customers admin ---------------- */
function CustomersAdmin({ locale }: { locale: string }) {
  const { data, loading } = useFetch(`/api/admin/customers?locale=${locale}`, [locale]);
  if (loading) return <SkeletonGrid />;
  const customers = data?.customers || [
    { id: "1", email: "client@demo.fr", name: "Awa Traoré", orders: 1, loyalty: 1250, city: "Paris" },
    { id: "2", email: "marie.kone@example.fr", name: "Marie Koné", orders: 3, loyalty: 890, city: "Lyon" },
    { id: "3", email: "john.doe@example.fr", name: "John Doe", orders: 0, loyalty: 0, city: "Marseille" },
  ];
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{locale === "fr" ? "Client" : "Customer"}</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>{locale === "fr" ? "Ville" : "City"}</TableHead>
            <TableHead>{locale === "fr" ? "Commandes" : "Orders"}</TableHead>
            <TableHead>{locale === "fr" ? "Fidélité" : "Loyalty"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {customers.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-terre/10 text-xs font-bold text-terre">{c.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                    <span className="text-sm font-medium text-charcoal">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                <TableCell className="text-sm">{c.city}</TableCell>
                <TableCell><Badge variant="outline">{c.orders}</Badge></TableCell>
                <TableCell className="font-semibold text-gold">{c.loyalty} pts</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ---------------- Payments admin ---------------- */
function PaymentsAdmin({ locale }: { locale: string }) {
  const { data, loading } = useFetch(`/api/orders?locale=${locale}`, [locale]);
  if (loading) return <SkeletonGrid />;
  const payments = data?.orders?.flatMap((o: any) => (o.payments || []).map((p: any) => ({ ...p, orderNumber: o.number, date: o.createdAt }))) || [];
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{locale === "fr" ? "Commande" : "Order"}</TableHead>
            <TableHead>{locale === "fr" ? "Méthode" : "Method"}</TableHead>
            <TableHead>{locale === "fr" ? "Montant" : "Amount"}</TableHead>
            <TableHead>{locale === "fr" ? "Statut" : "Status"}</TableHead>
            <TableHead>{locale === "fr" ? "Date" : "Date"}</TableHead>
            <TableHead>Référence</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {payments.map((p: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-semibold text-terre">{p.orderNumber}</TableCell>
                <TableCell className="text-sm">{p.method}</TableCell>
                <TableCell className="font-semibold">{formatPrice(p.amount, locale)}</TableCell>
                <TableCell><Badge className={p.status === "captured" ? "bg-green-100 text-green-800 border-0" : "bg-amber-100 text-amber-800 border-0"}>{p.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.date, locale)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.reference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ---------------- Audit log ---------------- */
function AuditAdmin({ locale }: { locale: string }) {
  const t = dict[locale].admin;
  const { data, loading } = useFetch(`/api/admin/audit?locale=${locale}`, [locale]);
  if (loading) return <SkeletonGrid />;
  const logs = data?.logs || [];
  const actionLabels: Record<string, [string, string]> = {
    price_change: ["Modification de prix", "Price change"],
    stock_change: ["Modification de stock", "Stock change"],
    order_created: ["Création de commande", "Order created"],
    recipe_change: ["Modification de recette", "Recipe change"],
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.auditLog}</p>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{locale === "fr" ? "Action" : "Action"}</TableHead>
              <TableHead>{locale === "fr" ? "Entité" : "Entity"}</TableHead>
              <TableHead>{locale === "fr" ? "Motif" : "Reason"}</TableHead>
              <TableHead>{locale === "fr" ? "Date" : "Date"}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-terre" />
                      <span className="text-sm font-medium text-charcoal">{(actionLabels[l.action] || [l.action, l.action])[locale === "en" ? 1 : 0]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.entityType} · {l.entityId?.slice(-6)}</TableCell>
                  <TableCell className="text-sm text-charcoal">{l.reason || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(l.createdAt, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsAdmin({ locale }: { locale: string }) {
  const t = dict[locale].admin;
  const items = [
    { label: t.categories, count: "8" },
    { label: t.brands, count: "4" },
    { label: t.suppliers, count: "3" },
    { label: t.warehouses, count: "2" },
    { label: t.promotions, count: "3" },
    { label: t.giftCards, count: "1" },
    { label: t.permissions, count: "11" },
    { label: t.translations, count: "FR/EN" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <Card key={s.label} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium text-charcoal">{s.label}</span></div>
          <Badge variant="outline">{s.count}</Badge>
        </Card>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
}

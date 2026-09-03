"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Bell, CheckCheck, ChefHat, Inbox, PackageCheck, Percent, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateTime } from "@/lib/format";
import { groupNotificationsByDay, parseNotificationDestination, type NotificationDateBucket } from "@/lib/notification-navigation";
import { useFetch } from "@/lib/use-fetch";
import { useStore } from "@/lib/store";

export type WebNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
};

type PushState = "checking" | "active" | "inactive" | "busy" | "denied" | "unsupported" | "needs-install";

const READ_STORAGE_KEY = "jma-read-notifications-v2";
const DEVICE_STORAGE_KEY = "jma-push-device-v1";
const SUBSCRIPTION_STORAGE_KEY = "jma-push-subscription-v1";
const iconByType = {
  recipe: ChefHat,
  order: PackageCheck,
  promotion: Percent,
};
const notificationFilterOrder = ["unread", "order", "recipe", "promotion"] as const;
type NotificationFilter = "all" | (typeof notificationFilterOrder)[number];

function decodeApplicationKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function getDeviceId() {
  const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (stored) return stored;
  const next = crypto.randomUUID();
  localStorage.setItem(DEVICE_STORAGE_KEY, next);
  return next;
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function persistSubscription(subscription: PushSubscription, locale: "fr" | "en") {
  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) throw new Error("Abonnement incomplet");
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: { endpoint: serialized.endpoint, keys: serialized.keys },
      deviceId: getDeviceId(),
      locale,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Activation impossible");
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, payload.id);
  return payload.id as string;
}

export function NotificationCenter() {
  const locale = useStore((state) => state.locale);
  const customer = useStore((state) => state.customer);
  const navigate = useStore((state) => state.navigate);
  const isMobile = useIsMobile();
  const { data, loading, error, refetch } = useFetch<{ notifications: WebNotification[] }>(`/api/notifications?locale=${locale}`, [customer?.id, locale]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [pushError, setPushError] = useState(false);
  const [open, setOpen] = useState(false);
  const notifications = data?.notifications || [];
  const readStorageKey = `${READ_STORAGE_KEY}:${customer?.id || "public"}`;

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(readStorageKey) || "[]"));
    } catch {
      setReadIds([]);
    }
  }, [readStorageKey]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "JMA_PUSH_RECEIVED") refetch();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [refetch]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isStandaloneApp()) {
      setPushState("needs-install");
      return;
    }

    let active = true;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (registration) => {
      const config = await fetch("/api/push/config", { cache: "no-store" }).then((response) => response.json());
      if (!active || !config.configured || !config.publicKey) {
        if (active) setPushState("unsupported");
        return;
      }
      setPublicKey(config.publicKey);
      const subscription = await registration.pushManager.getSubscription();
      if (!active) return;
      if (subscription) await persistSubscription(subscription, locale);
      if (Notification.permission === "denied") setPushState("denied");
      else setPushState(subscription ? "active" : "inactive");
    }).catch(() => active && setPushState("unsupported"));

    return () => {
      active = false;
    };
  }, [customer?.id, locale]);

  const unread = useMemo(
    () => notifications.filter((notification) => !readIds.includes(notification.id)).length,
    [notifications, readIds]
  );

  const markRead = (ids: string[]) => {
    setReadIds((current) => {
      const next = Array.from(new Set([...current, ...ids])).slice(-200);
      localStorage.setItem(readStorageKey, JSON.stringify(next));
      const allVisibleRead = notifications.every((notification) => next.includes(notification.id));
      if (allVisibleRead && "clearAppBadge" in navigator) (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => undefined);
      return next;
    });
  };

  const enablePush = async () => {
    if (!publicKey || pushState === "busy") return;
    setPushState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "inactive");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationKey(publicKey),
      });
      await persistSubscription(subscription, locale);
      setPushState("active");
      setPushError(false);
    } catch {
      setPushState("inactive");
      setPushError(true);
    }
  };

  const disablePush = async () => {
    if (pushState === "busy") return;
    setPushState("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
      setPushState("inactive");
      setPushError(false);
    } catch {
      setPushState("active");
      setPushError(true);
    }
  };

  const openNotification = (notification: WebNotification) => {
    markRead([notification.id]);
    setOpen(false);
    const destination = parseNotificationDestination(notification.url || "/");
    if (destination) {
      navigate(destination.view, destination.params);
      return;
    }
    navigate("home");
  };

  const pushCopy = pushError
    ? (locale === "fr" ? "Action impossible, vérifiez les réglages" : "Action failed, check your settings")
    : pushState === "active"
      ? (locale === "fr" ? "Actives sur cet appareil" : "Active on this device")
      : pushState === "denied"
        ? (locale === "fr" ? "Bloquées dans les réglages" : "Blocked in settings")
        : pushState === "needs-install"
          ? (locale === "fr" ? "Ajoutez l’app à l’écran d’accueil" : "Add the app to Home Screen")
          : pushState === "unsupported"
            ? (locale === "fr" ? "Indisponibles sur ce navigateur" : "Unavailable in this browser")
            : (locale === "fr" ? "Suivi de commande en temps réel" : "Live order updates");

  const trigger = (
    <Button variant="ghost" size="icon" className="relative" aria-label={locale === "fr" ? `Notifications, ${unread} non lues` : `Notifications, ${unread} unread`}>
      <Bell className="h-5 w-5" />
      {unread > 0 ? <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-terre px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span> : null}
    </Button>
  );
  const panel = (
    <NotificationPanel
      locale={locale}
      notifications={notifications}
      loading={loading}
      error={Boolean(error)}
      unread={unread}
      readIds={readIds}
      pushState={pushState}
      pushCopy={pushCopy}
      pushError={pushError}
      onReadAll={() => markRead(notifications.map((notification) => notification.id))}
      onOpenNotification={openNotification}
      onTogglePush={(checked) => void (checked ? enablePush() : disablePush())}
      onRetry={refetch}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-full max-w-none gap-0 overflow-hidden bg-white p-0 sm:max-w-md">
          <SheetHeader className="sr-only"><SheetTitle>Notifications</SheetTitle><SheetDescription>{locale === "fr" ? "Alertes et suivi de votre activité" : "Alerts and activity updates"}</SheetDescription></SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(25rem,calc(100vw-1rem))] overflow-hidden p-0">
        {panel}
      </PopoverContent>
    </Popover>
  );
}

function NotificationPanel({
  locale,
  notifications,
  loading,
  error,
  unread,
  readIds,
  pushState,
  pushCopy,
  pushError,
  onReadAll,
  onOpenNotification,
  onTogglePush,
  onRetry,
}: {
  locale: "fr" | "en";
  notifications: WebNotification[];
  loading: boolean;
  error: boolean;
  unread: number;
  readIds: string[];
  pushState: PushState;
  pushCopy: string;
  pushError: boolean;
  onReadAll: () => void;
  onOpenNotification: (notification: WebNotification) => void;
  onTogglePush: (checked: boolean) => void;
  onRetry: () => void;
}) {
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>("all");
  const readIdSet = useMemo(() => new Set(readIds), [readIds]);
  const notificationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const notification of notifications) {
      counts.set(notification.type, (counts.get(notification.type) || 0) + 1);
    }
    return counts;
  }, [notifications]);
  const availableFilters = useMemo(
    () => notificationFilterOrder.filter((type) => type === "unread" ? unread > 0 : notificationCounts.has(type)),
    [notificationCounts, unread]
  );
  const activeFilter = selectedFilter === "all" || availableFilters.includes(selectedFilter) ? selectedFilter : "all";
  const filteredNotifications = useMemo(
    () => activeFilter === "all" ? notifications : activeFilter === "unread" ? notifications.filter((notification) => !readIdSet.has(notification.id)) : notifications.filter((notification) => notification.type === activeFilter),
    [activeFilter, notifications, readIdSet]
  );
  const notificationGroups = useMemo(() => groupNotificationsByDay(filteredNotifications), [filteredNotifications]);
  const filterLabel = (filter: NotificationFilter) => {
    if (filter === "all") return locale === "fr" ? "Toutes" : "All";
    if (filter === "unread") return locale === "fr" ? "Non lues" : "Unread";
    if (filter === "order") return locale === "fr" ? "Commandes" : "Orders";
    if (filter === "recipe") return locale === "fr" ? "Recettes" : "Recipes";
    return locale === "fr" ? "Offres" : "Offers";
  };
  const dayLabel = (bucket: NotificationDateBucket) => {
    if (bucket === "today") return locale === "fr" ? "Aujourd’hui" : "Today";
    if (bucket === "yesterday") return locale === "fr" ? "Hier" : "Yesterday";
    return locale === "fr" ? "Plus tôt" : "Earlier";
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white md:h-auto md:max-h-[min(42rem,calc(100vh-5rem))]">
      <div className="african-kente-stripe h-[3px] shrink-0" />
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 pr-12 md:pr-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-terre">{locale === "fr" ? "Centre d’activité" : "Activity centre"}</p>
          <h2 className="mt-0.5 text-lg font-black leading-tight text-charcoal">Notifications</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">{unread > 0 ? (locale === "fr" ? `${unread} nouvelle${unread > 1 ? "s" : ""} à consulter` : `${unread} new to review`) : (locale === "fr" ? "Toute votre activité est à jour" : "All your activity is up to date")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onRetry} disabled={loading} className="h-9 w-9 text-muted-foreground hover:bg-cream hover:text-terre" aria-label={locale === "fr" ? "Actualiser les notifications" : "Refresh notifications"}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {unread > 0 ? <button type="button" onClick={onReadAll} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-terre hover:bg-terre/5"><CheckCheck className="h-3.5 w-3.5" /> {locale === "fr" ? "Tout lire" : "Read all"}</button> : null}
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-border bg-cream/55 px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white"><Image src="/brand/logo-mark-burgundy.png" alt="" width={72} height={72} className="h-8 w-8 object-contain" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black text-charcoal">{locale === "fr" ? "Alertes sur cet appareil" : "Alerts on this device"}</span>
            <span className={`mt-0.5 block text-[10px] ${pushState === "denied" || pushError ? "text-destructive" : "text-muted-foreground"}`}>{pushCopy}</span>
          </span>
          {pushState === "denied" ? <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" /> : (
            <Switch checked={pushState === "active"} disabled={["checking", "busy", "unsupported", "needs-install"].includes(pushState)} onCheckedChange={onTogglePush} aria-label={locale === "fr" ? "Activer les alertes mobiles" : "Enable mobile alerts"} />
          )}
      </div>

      {!loading && !error && notifications.length > 0 ? (
        <div className="shrink-0 border-b border-border px-3 py-2.5">
          <div role="tablist" aria-label={locale === "fr" ? "Filtrer les notifications" : "Filter notifications"} className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {(["all", ...availableFilters] as NotificationFilter[]).map((filter) => {
              const count = filter === "all" ? notifications.length : filter === "unread" ? unread : notificationCounts.get(filter) || 0;
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="notification-activity-list"
                  onClick={() => setSelectedFilter(filter)}
                  className={`inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/45 ${isActive ? "bg-burgundy text-white" : "bg-muted/55 text-muted-foreground hover:bg-cream hover:text-charcoal"}`}
                >
                  {filterLabel(filter)}
                  <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[9px] ${isActive ? "bg-white/15 text-white" : "bg-white text-charcoal"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div id="notification-activity-list" role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? <div className="space-y-1 p-3" aria-label={locale === "fr" ? "Chargement des notifications" : "Loading notifications"}>{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-md bg-muted" />)}</div> : null}
        {!loading && error ? <div className="grid min-h-48 place-items-center px-6 text-center"><div><ShieldAlert className="mx-auto h-7 w-7 text-destructive" /><p className="mt-3 text-xs font-bold text-charcoal">{locale === "fr" ? "Notifications indisponibles" : "Notifications unavailable"}</p><Button type="button" variant="link" size="sm" onClick={onRetry} className="mt-1 text-terre">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div></div> : null}
        {!loading && !error && !notifications.length ? <div className="grid min-h-48 place-items-center px-6 text-center"><div><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-xs font-bold text-charcoal">{locale === "fr" ? "Aucune notification" : "No notifications"}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Les actualités de vos commandes et offres apparaîtront ici." : "Order and offer updates will appear here."}</p></div></div> : null}
        {!loading && !error && notifications.length > 0 && !filteredNotifications.length ? <div className="grid min-h-48 place-items-center px-6 text-center"><div><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-xs font-bold text-charcoal">{locale === "fr" ? "Aucune activité dans cette catégorie" : "No activity in this category"}</p><button type="button" onClick={() => setSelectedFilter("all")} className="mt-2 min-h-9 rounded-md px-3 text-xs font-bold text-terre hover:bg-terre/5">{locale === "fr" ? "Voir toutes les notifications" : "View all notifications"}</button></div></div> : null}
        {!loading && !error ? notificationGroups.map((group) => (
          <div key={group.key}>
            <p className="border-b border-burgundy/10 bg-cream/45 px-4 py-1.5 text-[9px] font-black uppercase text-burgundy">{dayLabel(group.key)}</p>
            {group.notifications.map((notification) => <NotificationActivityRow key={notification.id} notification={notification} isRead={readIdSet.has(notification.id)} locale={locale} onOpen={onOpenNotification} />)}
          </div>
        )) : null}
      </div>
    </div>
  );
}

function NotificationActivityRow({ notification, isRead, locale, onOpen }: { notification: WebNotification; isRead: boolean; locale: "fr" | "en"; onOpen: (notification: WebNotification) => void }) {
  const Icon = iconByType[notification.type as keyof typeof iconByType] || Bell;
  const typeLabel = notification.type === "order"
    ? (locale === "fr" ? "Commande" : "Order")
    : notification.type === "recipe"
      ? (locale === "fr" ? "Recette" : "Recipe")
      : notification.type === "promotion"
        ? (locale === "fr" ? "Offre" : "Offer")
        : (locale === "fr" ? "Information" : "Information");

  return (
    <button type="button" onClick={() => onOpen(notification)} className={`group flex w-full gap-3 border-b border-border/70 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none ${isRead ? "bg-white" : "bg-terre/[0.035]"}`}>
      <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isRead ? "bg-muted text-muted-foreground" : "bg-terre/10 text-terre"}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2"><span className="flex-1 text-xs font-black leading-5 text-charcoal">{notification.title}</span>{!isRead ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terre" /> : null}</span>
        <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">{notification.body}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold uppercase text-muted-foreground"><span>{typeLabel}</span><span aria-hidden="true">·</span><time dateTime={notification.createdAt}>{formatDateTime(notification.createdAt, locale)}</time></span>
      </span>
      <ArrowRight className="mt-3 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-terre" aria-hidden="true" />
    </button>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Bell, CheckCheck, ChefHat, PackageCheck, Percent, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useFetch } from "@/lib/use-fetch";
import { useStore } from "@/lib/store";

type WebNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

type PushState = "checking" | "active" | "inactive" | "busy" | "denied" | "unsupported" | "needs-install";

const READ_STORAGE_KEY = "jma-read-notifications-v1";
const DEVICE_STORAGE_KEY = "jma-push-device-v1";
const SUBSCRIPTION_STORAGE_KEY = "jma-push-subscription-v1";

const iconByType = {
  recipe: ChefHat,
  order: PackageCheck,
  promotion: Percent,
};

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
  const { data } = useFetch<{ notifications: WebNotification[] }>(`/api/notifications?locale=${locale}`, [locale]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [pushError, setPushError] = useState(false);

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || "[]"));
    } catch {
      setReadIds([]);
    }

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

  const notifications = data?.notifications || [];
  const unread = useMemo(
    () => notifications.filter((notification) => !readIds.includes(notification.id)).length,
    [notifications, readIds]
  );

  const setRead = (ids: string[]) => {
    setReadIds(ids);
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
    if ("clearAppBadge" in navigator) (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => undefined);
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

  return (
    <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label={locale === "fr" ? `Notifications, ${unread} non lues` : `Notifications, ${unread} unread`}>
            <Bell className="h-5 w-5" />
            {unread > 0 ? <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-terre px-1 text-[9px] font-bold text-white">{unread}</span> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(23rem,calc(100vw-1rem))] overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-charcoal">Notifications</p>
              <p className="text-[11px] text-muted-foreground">{unread > 0 ? (locale === "fr" ? `${unread} nouvelle${unread > 1 ? "s" : ""}` : `${unread} new`) : (locale === "fr" ? "Vous êtes à jour" : "You are up to date")}</p>
            </div>
            {unread > 0 ? <button onClick={() => setRead(notifications.map((notification) => notification.id))} className="inline-flex items-center gap-1 text-xs font-semibold text-terre hover:underline"><CheckCheck className="h-3.5 w-3.5" /> {locale === "fr" ? "Tout lire" : "Read all"}</button> : null}
          </div>

          <div className="border-b border-border bg-muted/35 p-3">
            <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream"><Image src="/brand/logo-mark.png" alt="" width={72} height={72} className="h-8 w-8 object-contain" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-charcoal">{locale === "fr" ? "Alertes mobiles" : "Mobile alerts"}</span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{pushCopy}</span>
              </span>
              {pushState === "denied" ? <ShieldAlert className="h-4 w-4 text-destructive" /> : (
                <Switch
                  checked={pushState === "active"}
                  disabled={["checking", "busy", "unsupported", "needs-install"].includes(pushState)}
                  onCheckedChange={(checked) => void (checked ? enablePush() : disablePush())}
                  aria-label={locale === "fr" ? "Activer les alertes mobiles" : "Enable mobile alerts"}
                />
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = iconByType[notification.type as keyof typeof iconByType] || Bell;
              const isRead = readIds.includes(notification.id);
              return (
                <button key={notification.id} onClick={() => setRead(Array.from(new Set([...readIds, notification.id])))} className={`flex w-full gap-3 border-b border-border/70 px-4 py-3 text-left transition hover:bg-muted/70 ${isRead ? "bg-white" : "bg-terre/[0.04]"}`}>
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-terre/10 text-terre"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2"><span className="flex-1 text-xs font-bold text-charcoal">{notification.title}</span>{!isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-terre" /> : null}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{notification.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
    </Popover>
  );
}

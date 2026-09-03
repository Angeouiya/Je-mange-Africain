"use client";

import { ReactNode, useState } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";

export function LogoutConfirmDialog({ children }: { children: ReactNode }) {
  const locale = useStore((state) => state.locale);
  const clearCustomer = useStore((state) => state.logout);
  const syncSavedItems = useStore((state) => state.syncSavedItems);
  const savedSyncStatus = useStore((state) => state.savedSyncStatus);
  const navigate = useStore((state) => state.navigate);
  const [busy, setBusy] = useState(false);

  const confirmLogout = async () => {
    setBusy(true);
    if (savedSyncStatus === "syncing" || savedSyncStatus === "error") await syncSavedItems();
    await fetch("/api/auth/customer/session", { method: "DELETE" }).catch(() => undefined);
    clearCustomer();
    navigate("home");
    setBusy(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><ShieldAlert className="h-5 w-5" /></span>
          <AlertDialogTitle>{locale === "fr" ? "Se déconnecter ?" : "Sign out?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {locale === "fr"
              ? "Votre session sera fermée sur cet appareil. Votre panier local restera disponible, mais vos informations personnelles et commandes nécessiteront une nouvelle connexion."
              : "Your session will close on this device. Your local cart stays available, but personal details and orders will require signing in again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{locale === "fr" ? "Rester connecté" : "Stay signed in"}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={() => void confirmLogout()} className="bg-destructive text-white hover:bg-destructive/90">
            <LogOut className="mr-2 h-4 w-4" /> {busy ? (locale === "fr" ? "Déconnexion..." : "Signing out...") : (locale === "fr" ? "Oui, me déconnecter" : "Yes, sign out")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

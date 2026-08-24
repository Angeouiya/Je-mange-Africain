import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "Administration - Je mange Africain",
  description: "Console d'administration Je mange Africain.",
};

export default function AdminPage() {
  return <AdminGate />;
}

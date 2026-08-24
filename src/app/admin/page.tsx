import type { Metadata } from "next";
import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = {
  title: "Administration - Je mange Africain",
  description: "Console d'administration Je mange Africain.",
};

export default function AdminPage() {
  return <AdminView />;
}

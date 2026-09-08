import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modifier le mot de passe - Je mange Africain",
  description: "Renouvellement sécurisé de l'accès à la console professionnelle Je mange Africain.",
  robots: { index: false, follow: false },
};

export default function AdminPasswordResetLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

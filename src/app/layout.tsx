import type { Metadata } from "next";
import { SessionProvider } from "@/context/session-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prise de rendez-vous",
  description: "Prise de rendez-vous entre clients et professionnels",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-page text-ink">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
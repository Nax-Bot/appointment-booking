import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { SessionProvider } from "@/context/session-context";
import "./globals.css";

// La police du site, téléchargée par Next.js.
// "variable" = le nom de la variable CSS qu'utilise globals.css.
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prise de rendez-vous",
  description: "Prise de rendez-vous entre clients et professionnels",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={outfit.variable}>
      <body className="min-h-screen bg-page text-ink antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
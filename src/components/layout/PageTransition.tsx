"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Fait apparaître chaque nouvelle page avec un léger fondu + glissement.
// key={pathname} : quand l'adresse change, l'animation repart.
export default function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return (
        <div key={pathname} className="animate-page-in">
            {children}
        </div>
    );
}

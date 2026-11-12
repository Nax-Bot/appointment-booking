"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Précharge toutes les pages de l'espace dès que le navigateur est au repos :
// au clic, la page est déjà prête et le changement est quasi instantané.
export default function RoutePrefetcher({ hrefs }: { hrefs: string[] }) {
    const router = useRouter();
    const key = hrefs.join("|");

    useEffect(() => {
        const list = key.split("|");
        const idle =
            typeof window.requestIdleCallback === "function"
                ? window.requestIdleCallback
                : (callback: () => void) => window.setTimeout(callback, 300);
        idle(() => {
            list.forEach((href) => router.prefetch(href));
        });
    }, [key, router]);

    return null;
}

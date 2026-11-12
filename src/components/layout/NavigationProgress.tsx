"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/context/session-context";
import { doneProgress, startProgress, subscribeProgress } from "@/lib/lib-front/progress";

// La barre de chargement fine en haut de l'écran, comme sur Facebook / YouTube.
// - Elle démarre dès le CLIC sur un lien interne, avant que la page change.
// - Elle se termine quand la nouvelle adresse est affichée.
export default function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.toString();
    const { user } = useSession();

    const [value, setValue] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        return subscribeProgress((newValue, newVisible) => {
            setValue(newValue);
            setVisible(newVisible);
        });
    }, []);

    // L'adresse a changé : la nouvelle page est là, on termine la barre
    useEffect(() => {
        doneProgress();
    }, [pathname, search]);

    // Un clic sur un lien interne lance la barre tout de suite
    useEffect(() => {
        function handleClick(event: MouseEvent) {
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const target = event.target as Element | null;
            const anchor = target !== null ? target.closest("a") : null;
            if (anchor === null) return;
            if (anchor.target !== "" && anchor.target !== "_self") return;
            if (anchor.hasAttribute("download")) return;

            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            // même page (ou simple ancre) : rien ne va changer
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;

            startProgress();
        }

        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, []);

    return (
        <div
            aria-hidden="true"
            data-role={user !== null ? user.role : undefined}
            className="pointer-events-none fixed top-0 right-0 left-0 z-[100] h-[3px]"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
        >
            <div
                className="relative h-full rounded-r-full bg-gradient-to-r from-primary via-[color-mix(in_srgb,var(--color-primary)_55%,white)] to-primary"
                style={{
                    width: value + "%",
                    transition: value === 0 ? "none" : "width 220ms ease-out",
                    boxShadow: "0 0 10px var(--color-primary), 0 0 5px var(--color-primary)",
                }}
            >
                {/* la petite « lueur » qui dépasse au bout de la barre */}
                <div className="absolute top-0 -right-1 h-full w-20 translate-y-[-1px] bg-gradient-to-r from-transparent to-white/70 opacity-70 blur-[2px]" />
            </div>
        </div>
    );
}

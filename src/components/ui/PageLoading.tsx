"use client";

import LottieLoader, { LoaderKind } from "@/components/ui/LottieLoader";
import { LoaderTone } from "@/lib/lib-front/lottie-theme";

// Le chargement d'une zone entière (une page, une liste) : animation + texte, centrés.
interface PageLoadingProps {
    kind: LoaderKind;
    label: string;
    tone?: LoaderTone;
    size?: number;
    compact?: boolean;
}

export default function PageLoading({ kind, label, tone, size = 140, compact = false }: PageLoadingProps) {
    return (
        <div
            className={
                "animate-fade-in flex items-center justify-center " + (compact ? "py-8" : "min-h-72 py-12")
            }
        >
            <LottieLoader kind={kind} tone={tone} size={size} label={label} />
        </div>
    );
}

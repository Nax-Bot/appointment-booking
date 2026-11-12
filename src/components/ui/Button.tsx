"use client";

import { ReactNode } from "react";
import LottieLoader, { LoaderKind } from "@/components/ui/LottieLoader";
import { LoaderTone } from "@/lib/lib-front/lottie-theme";

// Un bouton.
// variant : "primary" (plein), "secondary" (blanc avec bordure, pour « Annuler »)
// ou "danger" (rouge, pour une suppression).
// fullWidth : prend toute la largeur (par défaut) ou seulement la taille de son texte.
// disabled sert à bloquer le bouton pendant un envoi.
// loading : affiche une petite animation Lottie (différente selon la variante) et bloque le bouton.
interface ButtonProps {
    children: ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "danger";
    fullWidth?: boolean;
}

export default function Button({
    children,
    type = "button",
    disabled = false,
    loading = false,
    onClick,
    variant = "primary",
    fullWidth = true,
}: ButtonProps) {
    let colorClass = "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md";
    let loaderKind: LoaderKind = "spinner";
    let loaderTone: LoaderTone = "light";
    if (variant === "secondary") {
        colorClass = "border border-line bg-white text-ink hover:border-primary/40 hover:bg-tint";
        loaderKind = "dots";
        loaderTone = "client";
    } else if (variant === "danger") {
        colorClass = "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md";
        loaderKind = "pulse";
        loaderTone = "light";
    }

    let widthClass = "";
    if (fullWidth) {
        widthClass = "w-full";
    }

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            aria-busy={loading}
            className={
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all duration-200 hover:-translate-y-px focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none " +
                colorClass +
                " " +
                widthClass
            }
        >
            {loading && <LottieLoader kind={loaderKind} tone={loaderTone} size={30} className="-my-2 -ml-1" />}
            {children}
        </button>
    );
}

import { ReactNode } from "react";

// Un bouton.
// variant : "primary" (vert plein) ou "secondary" (blanc avec bordure, pour « Annuler »).
// fullWidth : prend toute la largeur (par défaut) ou seulement la taille de son texte.
// disabled sert à bloquer le bouton pendant un envoi.
interface ButtonProps {
    children: ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
    variant?: "primary" | "secondary";
    fullWidth?: boolean;
}

export default function Button({
    children,
    type = "button",
    disabled = false,
    onClick,
    variant = "primary",
    fullWidth = true,
}: ButtonProps) {
    let colorClass = "bg-primary text-white hover:bg-primary-hover";
    if (variant === "secondary") {
        colorClass = "border border-line bg-white text-ink hover:bg-tint";
    }

    let widthClass = "";
    if (fullWidth) {
        widthClass = "w-full";
    }

    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={
                "rounded-lg px-4 py-2 font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:opacity-50 " +
                colorClass +
                " " +
                widthClass
            }
        >
            {children}
        </button>
    );
}   
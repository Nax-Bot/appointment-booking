import { ReactNode } from "react";

// Un bouton. disabled sert à bloquer le bouton pendant un envoi.
interface ButtonProps {
    children: ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
}

export default function Button({
    children,
    type = "button",
    disabled = false,
    onClick,
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white hover:opacity-90 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
            {children}
        </button>
    );
}
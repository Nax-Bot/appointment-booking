"use client";

import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";

// Une fenêtre qui s'affiche par-dessus la page, sur un fond sombre.
// open = visible ou non. onClose = ce qui se passe quand on la ferme (croix ou Échap).
// Un clic sur le fond sombre ne la ferme pas : on évite de perdre un texte tapé par erreur.
// allowOverflow = true : ce qui dépasse de la fenêtre reste visible (pour un panneau flottant).
// Par défaut, une fenêtre trop haute défile à l'intérieur.
interface ModalProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    allowOverflow?: boolean;
}

export default function Modal({
    open,
    title,
    onClose,
    children,
    allowOverflow = false,
}: ModalProps) {
    // La touche Échap ferme la fenêtre (seulement quand elle est ouverte)
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (open === true && event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (open === false) {
        return null;
    }

    let scrollClass = "max-h-[90vh] overflow-y-auto";
    if (allowOverflow) {
        scrollClass = "";
    }

    return (
        // fixed inset-0 = couvre tout l'écran ; z-50 = passe devant tout le reste
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in bg-ink/40 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={"animate-pop-in w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl " + scrollClass}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-ink">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        className="rounded-lg p-1 text-muted hover:bg-tint hover:text-ink"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
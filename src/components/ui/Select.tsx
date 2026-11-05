"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

// Une liste déroulante au style de la palette (la liste d'un <select> natif
// est dessinée par le navigateur et ne peut pas être stylée).
// options = la liste des choix : valeur envoyée + texte affiché.
interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
}

export default function Select({ label, value, onChange, options }: SelectProps) {
    const [open, setOpen] = useState(false); // la liste est-elle ouverte ?
    const containerRef = useRef<HTMLDivElement>(null); // pour savoir où l'on clique

    // Fermer la liste quand on clique en dehors du composant
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const container = containerRef.current;
            if (container !== null && container.contains(event.target as Node) === false) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Le texte du choix actuel (celui qu'on affiche dans le bouton)
    let selectedLabel = "";
    for (const option of options) {
        if (option.value === value) {
            selectedLabel = option.label;
        }
    }

    // Passer au choix suivant (step = 1) ou précédent (step = -1)
    function moveSelection(step: number) {
        let currentIndex = 0;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === value) {
                currentIndex = i;
            }
        }
        const newIndex = currentIndex + step;
        if (newIndex >= 0 && newIndex < options.length) {
            onChange(options[newIndex].value);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    function handleChoose(newValue: string) {
        onChange(newValue);
        setOpen(false);
    }

    return (
        <div className="relative mb-4" ref={containerRef}>
            <span className="mb-1 block text-sm font-medium text-ink">{label}</span>

            <button
                type="button"
                onClick={() => setOpen(!open)}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-lg border border-accent bg-white px-3 py-2 text-left text-ink focus:border-primary focus:ring-2 focus:ring-accent/40 focus:outline-none"
            >
                <span>{selectedLabel}</span>
                {/* Petite flèche, qui se retourne quand la liste est ouverte */}
                <ChevronDown
                    className={
                        "h-4 w-4 text-ink/60 transition-transform duration-200 " +
                        (open ? "rotate-180" : "")
                    }
                    strokeWidth={2.5}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-soft bg-white py-1 shadow-lg"
                >
                    {/* map = une ligne par choix de la liste */}
                    {options.map((option) => {
                        const isSelected = option.value === value;

                        let optionClass = "text-ink hover:bg-soft";
                        if (isSelected) {
                            optionClass = "bg-page font-medium text-primary hover:bg-soft";
                        }

                        return (
                            <li
                                key={option.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleChoose(option.value)}
                                className={
                                    "flex cursor-pointer items-center justify-between px-3 py-2 " + optionClass
                                }
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
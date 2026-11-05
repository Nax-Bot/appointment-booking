"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { getPasswordChecks, getPasswordStrength } from "@/lib/form-validation";

// Champ mot de passe avec icône œil.
// showStrength = true : affiche la barre de force et la liste des critères
// (à l'inscription seulement, pas à la connexion).
interface PasswordInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: string;
    showStrength?: boolean;
}

// Une ligne de la liste des critères : rond vert avec coche si respecté, rond gris sinon
// transition-colors = le changement de couleur se fait en fondu au lieu d'être instantané
function CheckItem({ ok, text }: { ok: boolean; text: string }) {
    let circleClass = "bg-gray-300";
    if (ok) {
        circleClass = "bg-green-500";
    }

    return (
        <li className="flex items-center gap-2 text-sm text-gray-700">
            <span
                className={
                    "flex h-5 w-5 items-center justify-center rounded-full text-white transition-colors duration-300 " +
                    circleClass
                }
            >
                <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {text}
        </li>
    );
}

export default function PasswordInput({
    label,
    value,
    onChange,
    onBlur,
    error = "",
    showStrength = false,
}: PasswordInputProps) {
    const [visible, setVisible] = useState(false); // mot de passe visible ou masqué
    const [focused, setFocused] = useState(false); // le champ est-il sélectionné ?

    const hasError = error !== "";
    const checks = getPasswordChecks(value);
    const strength = getPasswordStrength(value);

    // Couleurs de la bordure et du halo quand on clique dans le champ
    let fieldClass = "border-line focus:border-primary focus:ring-primary/20";
    if (hasError) {
        fieldClass = "border-red-300 focus:border-red-400 focus:ring-red-100";
    }

    // Couleur de la barre de force et du mot « Faible / Moyen / Fort »
    let barColor = "bg-red-500";
    let labelColor = "text-red-600";
    if (strength.label === "Fort") {
        barColor = "bg-green-500";
        labelColor = "text-green-600";
    } else if (strength.label === "Moyen") {
        barColor = "bg-amber-500";
        labelColor = "text-amber-600";
    }
    // Largeur de la barre : 0 % à 100 % selon le nombre de critères respectés
    const barWidth = (strength.score / 5) * 100 + "%";

    function handleBlur() {
        setFocused(false);
        if (onBlur !== undefined) {
            onBlur();
        }
    }

    return (
        // "relative" = repère de position pour le panneau flottant plus bas
        <div className="relative mb-4">
            <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
                <div className="relative">
                    <input
                        type={visible ? "text" : "password"}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={handleBlur}
                        className={
                            "block w-full rounded-lg border bg-white px-3 py-2 pr-10 text-ink focus:ring-2 focus:outline-none " +
                            fieldClass
                        }
                    />
                    <button
                        type="button"
                        onClick={() => setVisible(!visible)}
                        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-ink"
                    >
                        {/* Œil barré : le mot de passe est visible, un clic le masque.
                Œil ouvert : le mot de passe est masqué, un clic l'affiche. */}
                        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </label>

            {hasError && <span className="mt-1 block text-xs text-red-600">{error}</span>}

            {showStrength && focused && (
                // absolute top-full : le panneau est accroché juste sous le champ et flotte
                // par-dessus le reste de la page, sans pousser le bouton vers le bas.
                // z-20 : il passe devant les éléments qui le suivent.
                <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                            {/* transition-all duration-500 ease-out : la largeur et la couleur
                  changent en douceur sur 0,5 seconde au lieu de sauter */}
                            <div
                                className={
                                    "h-full rounded-full transition-all duration-500 ease-out " + barColor
                                }
                                style={{ width: barWidth }}
                            />
                        </div>
                        <span className={"text-sm font-bold transition-colors duration-300 " + labelColor}>
                            {strength.label}
                        </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-2">
                        <CheckItem ok={checks.length} text="8 caractères" />
                        <CheckItem ok={checks.uppercase} text="Majuscule" />
                        <CheckItem ok={checks.lowercase} text="Minuscule" />
                        <CheckItem ok={checks.digit} text="Chiffre" />
                        <CheckItem ok={checks.special} text="Caractère spécial" />
                    </ul>
                </div>
            )}
        </div>
    );
}
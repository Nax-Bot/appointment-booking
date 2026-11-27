"use client";

import { useRef, useState } from "react";
import { Calendar } from "lucide-react";

// Un champ date en français : on tape « 23/12/2026 » (les « / » se mettent tout seuls),
// ou on clique sur l'icône pour choisir dans un calendrier.
// La valeur échangée avec la page reste « AAAA-MM-JJ » (comme un champ date classique) :
// vide tant que la date n'est pas complète et valide.
interface DateInputProps {
    label: string;
    value: string; // « AAAA-MM-JJ » ou ""
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: string;
}

const EXAMPLE = "23/12/2026";

// « 2026-12-23 » -> « 23/12/2026 »
function isoToText(iso: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (match === null) {
        return "";
    }
    return match[3] + "/" + match[2] + "/" + match[1];
}

// « 23/12/2026 » -> « 2026-12-23 », ou "" si ce n'est pas une vraie date (31/02/2026, par exemple)
function textToIso(text: string): string {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (match === null) {
        return "";
    }
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (year < 1900) {
        return "";
    }
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
        return "";
    }
    return match[3] + "-" + match[2] + "-" + match[1];
}

// Ne garde que les chiffres (8 au plus) et remet les « / » : 23122026 -> 23/12/2026
function maskDigits(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let result = digits.slice(0, 2);
    if (digits.length > 2) {
        result += "/" + digits.slice(2, 4);
    }
    if (digits.length > 4) {
        result += "/" + digits.slice(4);
    }
    return result;
}

export default function DateInput({ label, value, onChange, onBlur, error = "" }: DateInputProps) {
    // Le texte tapé. Il suit la valeur de la page quand elle change de l'extérieur
    // (clic sur un jour du calendrier, remise à zéro du formulaire...).
    const [text, setText] = useState(isoToText(value));
    const [previousValue, setPreviousValue] = useState(value);
    const pickerRef = useRef<HTMLInputElement>(null);

    if (value !== previousValue) {
        setPreviousValue(value);
        if (value !== textToIso(text)) {
            setText(isoToText(value));
        }
    }

    // Une date complète (10 caractères) mais impossible : on le dit tout de suite
    let shownError = error;
    if (shownError === "" && text.length === 10 && textToIso(text) === "") {
        shownError = "Date invalide. Exemple : " + EXAMPLE;
    }
    const hasError = shownError !== "";

    let fieldClass = "border-line focus:border-primary focus:ring-primary/20";
    if (hasError) {
        fieldClass = "border-red-300 focus:border-red-400 focus:ring-red-100";
    }

    function handleType(raw: string) {
        const masked = maskDigits(raw);
        const iso = textToIso(masked);
        setText(masked);
        setPreviousValue(iso);
        onChange(iso);
    }

    function handlePick(iso: string) {
        setText(isoToText(iso));
        setPreviousValue(iso);
        onChange(iso);
    }

    function openPicker() {
        const picker = pickerRef.current;
        if (picker === null) {
            return;
        }
        try {
            picker.showPicker();
        } catch {
            picker.focus();
        }
    }

    return (
        <div className="block">
            <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
                <span className="relative block">
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={text}
                        placeholder={EXAMPLE}
                        maxLength={10}
                        onChange={(event) => handleType(event.target.value)}
                        onBlur={onBlur}
                        className={
                            "block w-full rounded-lg border bg-white py-2.5 pr-11 pl-3 text-ink tabular-nums transition-shadow duration-200 placeholder:text-muted/45 focus:ring-2 focus:outline-none " +
                            fieldClass
                        }
                    />
                    {/* Le vrai champ date, caché : il ne sert qu'à ouvrir le calendrier du navigateur */}
                    <input
                        ref={pickerRef}
                        type="date"
                        tabIndex={-1}
                        aria-hidden="true"
                        value={value}
                        onChange={(event) => handlePick(event.target.value)}
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                    />
                    <button
                        type="button"
                        onClick={openPicker}
                        aria-label="Choisir dans le calendrier"
                        className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-tint hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    >
                        <Calendar className="h-4 w-4" />
                    </button>
                </span>
            </label>
            <span className="mt-1 mb-1 block min-h-4 text-xs leading-4 text-red-600">
                {hasError && <span className="animate-fade-in">{shownError}</span>}
            </span>
        </div>
    );
}

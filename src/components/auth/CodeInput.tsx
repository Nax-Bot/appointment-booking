"use client";

import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";

export const CODE_LENGTH = 6;

interface CodeInputProps {
    digits: string[]; // toujours CODE_LENGTH cases : un chiffre ou ""
    onChange: (digits: string[]) => void;
    disabled?: boolean;
    hasError?: boolean;
    // Quand ce nombre change, le curseur revient sur la première case vide
    focusSignal?: number;
}

// Le code de vérification : une case par chiffre.
// Le curseur avance tout seul, Retour arrière recule, et on peut coller le code d'un seul coup.
export default function CodeInput({ digits, onChange, disabled = false, hasError = false, focusSignal = 0 }: CodeInputProps) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    function focusBox(index: number) {
        const box = refs.current[index];
        if (box) {
            box.focus();
            box.select();
        }
    }

    // Retour sur la première case vide (au démarrage et après une erreur)
    useEffect(() => {
        const firstEmpty = digits.findIndex((digit) => digit === "");
        focusBox(firstEmpty === -1 ? 0 : firstEmpty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusSignal]);

    // Écrit une suite de chiffres à partir d'une case (saisie, collage, remplissage automatique du téléphone)
    function writeFrom(start: number, text: string) {
        const onlyDigits = text.replace(/\D/g, "");
        if (onlyDigits === "") {
            return;
        }
        const next = [...digits];
        let position = start;
        for (const digit of onlyDigits) {
            if (position >= CODE_LENGTH) {
                break;
            }
            next[position] = digit;
            position += 1;
        }
        onChange(next);
        focusBox(Math.min(position, CODE_LENGTH - 1));
    }

    function handleChange(index: number, value: string) {
        if (value === "") {
            const next = [...digits];
            next[index] = "";
            onChange(next);
            return;
        }
        writeFrom(index, value);
    }

    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Backspace" && digits[index] === "" && index > 0) {
            event.preventDefault();
            const next = [...digits];
            next[index - 1] = "";
            onChange(next);
            focusBox(index - 1);
        } else if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            focusBox(index - 1);
        } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
            event.preventDefault();
            focusBox(index + 1);
        }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
        event.preventDefault();
        const text = event.clipboardData.getData("text");
        // Un code collé remplit toujours depuis la première case
        const next = new Array<string>(CODE_LENGTH).fill("");
        let position = 0;
        for (const digit of text.replace(/\D/g, "")) {
            if (position >= CODE_LENGTH) {
                break;
            }
            next[position] = digit;
            position += 1;
        }
        onChange(next);
        focusBox(Math.min(position, CODE_LENGTH - 1));
    }

    return (
        <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Code de vérification à 6 chiffres">
            {digits.map((digit, index) => {
                let boxClass = "border-line focus:border-primary focus:ring-primary/20";
                if (hasError) {
                    boxClass = "border-red-300 bg-red-50/60 focus:border-red-400 focus:ring-red-100";
                } else if (digit !== "") {
                    boxClass = "border-primary/50 bg-tint/60 focus:border-primary focus:ring-primary/20";
                }
                return (
                    <input
                        key={index}
                        ref={(element) => {
                            refs.current[index] = element;
                        }}
                        value={digit}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={CODE_LENGTH}
                        disabled={disabled}
                        aria-label={"Chiffre " + (index + 1)}
                        onChange={(event) => handleChange(index, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        onPaste={handlePaste}
                        onFocus={(event) => event.target.select()}
                        className={
                            "h-13 w-11 rounded-xl border bg-white text-center text-2xl font-semibold text-ink tabular-nums transition-all duration-150 focus:ring-4 focus:outline-none disabled:opacity-60 sm:h-14 sm:w-12 " +
                            boxClass
                        }
                    />
                );
            })}
        </div>
    );
}

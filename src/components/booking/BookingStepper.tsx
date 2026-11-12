"use client";

import { Check } from "lucide-react";

// Une étape de la réservation
export interface BookingStep {
    title: string; // « Service »
    summary: string; // ce qui a été choisi, ou ce qu'il reste à faire
    state: "done" | "current" | "todo";
    clickable: boolean;
}

interface BookingStepperProps {
    steps: BookingStep[];
    onSelect: (index: number) => void; // index à partir de 0
}

// La liste des étapes : verticale à gauche sur grand écran, en ligne compacte sur petit écran.
// Une étape terminée porte une coche ; on peut cliquer dessus pour la modifier.
export default function BookingStepper({ steps, onSelect }: BookingStepperProps) {
    return (
        <nav aria-label="Étapes de la réservation">
            {/* Petit écran : pastilles numérotées + titre de l'étape en cours */}
            <ol className="flex items-center gap-2 lg:hidden">
                {steps.map((step, index) => (
                    <li key={step.title} className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={step.clickable === false}
                            onClick={() => onSelect(index)}
                            aria-label={step.title}
                            aria-current={step.state === "current" ? "step" : undefined}
                            className="disabled:cursor-default"
                        >
                            <Dot index={index} state={step.state} />
                        </button>
                        {step.state === "current" && (
                            <span className="text-sm font-semibold text-ink">{step.title}</span>
                        )}
                        {index < steps.length - 1 && <span className="h-px w-4 bg-line" />}
                    </li>
                ))}
            </ol>

            {/* Grand écran : colonne verticale reliée par un trait */}
            <ol className="hidden lg:block">
                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;
                    let titleClass = "text-muted";
                    if (step.state === "current") {
                        titleClass = "font-semibold text-ink";
                    } else if (step.state === "done") {
                        titleClass = "font-medium text-ink/80";
                    }

                    return (
                        <li key={step.title} className="relative pb-7 last:pb-0">
                            {/* Le trait qui relie cette étape à la suivante */}
                            {isLast === false && (
                                <span
                                    className={
                                        "absolute top-8 bottom-0 left-4 w-px " +
                                        (step.state === "done" ? "bg-primary/40" : "bg-line")
                                    }
                                />
                            )}
                            <button
                                type="button"
                                disabled={step.clickable === false}
                                onClick={() => onSelect(index)}
                                aria-current={step.state === "current" ? "step" : undefined}
                                className="group relative flex w-full items-start gap-3 text-left disabled:cursor-default"
                            >
                                <Dot index={index} state={step.state} />
                                <span className="min-w-0 pt-0.5">
                                    <span className={"block text-sm transition-colors " + titleClass}>
                                        {step.title}
                                    </span>
                                    <span className="block truncate text-xs text-muted">{step.summary}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

// Le rond d'une étape : coche (terminée), plein (en cours) ou grisé (à venir)
function Dot({ index, state }: { index: number; state: BookingStep["state"] }) {
    if (state === "done") {
        return (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-white text-primary transition-transform group-hover:scale-105">
                <Check className="h-4 w-4" strokeWidth={3} />
            </span>
        );
    }
    if (state === "current") {
        return (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/30 ring-4 ring-primary/15">
                {index + 1}
            </span>
        );
    }
    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-sm font-medium text-muted">
            {index + 1}
        </span>
    );
}

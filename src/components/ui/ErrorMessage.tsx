"use client";

import { ReactNode, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";

// Un message d'erreur sans cadre : une icône, le message et,
// s'il y en a, la liste des détails.
// Par défaut, il s'affiche dès que le message n'est pas vide.
// isDisplay = false permet de le cacher même si le message n'est pas vide.
// tone : "error" (rouge, par défaut) ou "warning" (ambre, pour un blocage temporaire).
// title : un titre en gras ; le message passe alors en texte normal dessous.
// children : un contenu en plus (un compte à rebours, par exemple).
//
// Le composant reste toujours dans la page : quand il apparaît ou disparaît, sa hauteur
// s'anime en douceur (0 -> hauteur du message) au lieu de pousser le formulaire d'un coup.
// Pendant la disparition, il garde le dernier message affiché pour ne pas se vider avant de se refermer.
interface ErrorMessageProps {
    message: string;
    details?: string[];
    isDisplay?: boolean;
    tone?: "error" | "warning";
    title?: string;
    children?: ReactNode;
}

interface Snapshot {
    message: string;
    detailsKey: string;
    details: string[];
    tone: "error" | "warning";
    title: string | undefined;
}

export default function ErrorMessage({
    message,
    details = [],
    isDisplay,
    tone = "error",
    title,
    children,
}: ErrorMessageProps) {
    let visible = message !== "";
    if (isDisplay === false) {
        visible = false;
    }

    // Dernier contenu réellement affiché (sert pendant l'animation de fermeture)
    const detailsKey = details.join("\u0000");
    const [snapshot, setSnapshot] = useState<Snapshot>({ message, detailsKey, details, tone, title });
    if (
        visible &&
        (snapshot.message !== message ||
            snapshot.detailsKey !== detailsKey ||
            snapshot.tone !== tone ||
            snapshot.title !== title)
    ) {
        setSnapshot({ message, detailsKey, details, tone, title });
    }

    // Ouvert : le contenu vient des props. Fermé : on garde le dernier contenu pendant que ça se referme.
    const shown = visible ? { message, details, tone, title } : snapshot;

    const isWarning = shown.tone === "warning";
    const iconClass = isWarning ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
    const titleClass = isWarning ? "text-amber-900" : "text-red-900";
    const textClass = isWarning ? "text-amber-800" : "text-red-800";
    const Icon = isWarning ? Clock : AlertCircle;

    return (
        // grid-rows 0fr -> 1fr : seule technique CSS qui anime une hauteur "auto" sans JavaScript
        <div
            className={
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out " +
                (visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
            }
            aria-hidden={visible === false}
        >
            <div className="min-h-0 overflow-hidden">
                {/* pb-4 (et non mb-4) : la marge se referme avec le message */}
                <div role={visible ? "alert" : undefined} className="flex gap-2.5 pb-4 text-sm">
                    <span
                        className={
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full " + iconClass
                        }
                    >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                        {shown.title !== undefined ? (
                            <>
                                <p className={"font-semibold leading-6 " + titleClass}>{shown.title}</p>
                                <p className={"leading-relaxed " + textClass}>{shown.message}</p>
                            </>
                        ) : (
                            <p className={"font-medium leading-6 " + titleClass}>{shown.message}</p>
                        )}
                        {shown.details.length > 0 && (
                            <ul className={"mt-1.5 space-y-0.5 " + textClass}>
                                {shown.details.map((detail) => (
                                    <li key={detail} className="flex gap-2">
                                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                                        <span className="min-w-0 [overflow-wrap:anywhere]">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {visible && children}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { ReactNode } from "react";
import { AlertCircle, Clock } from "lucide-react";

// Un message d'erreur sans cadre : une icône, le message et,
// s'il y en a, la liste des détails.
// Par défaut, il s'affiche dès que le message n'est pas vide.
// isDisplay = false permet de le cacher même si le message n'est pas vide.
// tone : "error" (rouge, par défaut) ou "warning" (ambre, pour un blocage temporaire).
// title : un titre en gras ; le message passe alors en texte normal dessous.
// children : un contenu en plus (un compte à rebours, par exemple).
interface ErrorMessageProps {
    message: string;
    details?: string[];
    isDisplay?: boolean;
    tone?: "error" | "warning";
    title?: string;
    children?: ReactNode;
}

export default function ErrorMessage({
    message,
    details = [],
    isDisplay,
    tone = "error",
    title,
    children,
}: ErrorMessageProps) {
    // Le cadre n'existe que s'il y a un message à montrer
    let visible = message !== "";
    if (isDisplay === false) {
        visible = false;
    }

    if (visible === false) {
        return null;
    }

    const isWarning = tone === "warning";
    const iconClass = isWarning ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
    const titleClass = isWarning ? "text-amber-900" : "text-red-900";
    const textClass = isWarning ? "text-amber-800" : "text-red-800";
    const Icon = isWarning ? Clock : AlertCircle;

    return (
        <div
            role="alert"
            className="animate-pop-in mb-4 flex gap-2.5 text-sm"
        >
            <span className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-full " + iconClass}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
                {title !== undefined ? (
                    <>
                        <p className={"font-semibold leading-6 " + titleClass}>{title}</p>
                        <p className={"leading-relaxed " + textClass}>{message}</p>
                    </>
                ) : (
                    <p className={"font-medium leading-6 " + titleClass}>{message}</p>
                )}
                {details.length > 0 && (
                    <ul className={"mt-1.5 space-y-0.5 " + textClass}>
                        {details.map((detail) => (
                            <li key={detail} className="flex gap-2">
                                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                                <span className="min-w-0 [overflow-wrap:anywhere]">{detail}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {children}
            </div>
        </div>
    );
}

// Un cadre rouge avec le message d'erreur et, s'il y en a, la liste des détails.
// Par défaut, il s'affiche dès que le message n'est pas vide.
// isDisplay = false permet de le cacher même si le message n'est pas vide.
interface ErrorMessageProps {
    message: string;
    details?: string[];
    isDisplay?: boolean;
}

export default function ErrorMessage({
    message,
    details = [],
    isDisplay,
}: ErrorMessageProps) {
    // Le cadre n'existe que s'il y a un message à montrer
    let visible = message !== "";
    if (isDisplay === false) {
        visible = false;
    }

    if (visible === false) {
        return null;
    }

    return (
        <div className="animate-pop-in mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">{message}</p>
            {details.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                    {details.map((detail) => (
                        <li key={detail}>{detail}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
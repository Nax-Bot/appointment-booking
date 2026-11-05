// Un champ de formulaire avec son étiquette.
// Si "error" n'est pas vide : bordure rouge clair et message sous le champ.
// Si "maxLength" est donné : un compteur « 12 / 150 » s'affiche sous le champ.
interface InputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void; // appelée quand on quitte le champ
    error?: string;
    type?: string;
    placeholder?: string;
    maxLength?: number;
}

export default function Input({
    label,
    value,
    onChange,
    onBlur,
    error = "",
    type = "text",
    placeholder = "",
    maxLength,
}: InputProps) {
    const hasError = error !== "";

    // Couleurs de la bordure et du halo quand on clique dans le champ
    let fieldClass = "border-line focus:border-primary focus:ring-primary/20";
    if (hasError) {
        fieldClass = "border-red-300 focus:border-red-400 focus:ring-red-100";
    }

    // Le compteur devient rouge quand on dépasse la limite
    let counterClass = "text-muted";
    if (maxLength !== undefined && value.length > maxLength) {
        counterClass = "text-red-600";
    }

    return (
        <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                className={
                    "block w-full rounded-lg border bg-white px-3 py-2 text-ink placeholder:text-muted/60 focus:ring-2 focus:outline-none " +
                    fieldClass
                }
            />
            {(hasError || maxLength !== undefined) && (
                <span className="mt-1 flex gap-2 text-xs">
                    {hasError && <span className="text-red-600">{error}</span>}
                    {maxLength !== undefined && (
                        <span className={"ml-auto " + counterClass}>
                            {value.length} / {maxLength}
                        </span>
                    )}
                </span>
            )}
        </label>
    );
}
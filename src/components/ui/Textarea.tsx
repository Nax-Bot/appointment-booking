// Une zone de texte sur plusieurs lignes, au même style que Input.
// maxLength sert seulement au compteur « 12 / 2000 » : le blocage se fait par le message d'erreur.
interface TextareaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
}

export default function Textarea({
    label,
    value,
    onChange,
    error = "",
    placeholder = "",
    rows = 5,
    maxLength,
}: TextareaProps) {
    const hasError = error !== "";

    let fieldClass = "border-line focus:border-primary focus:ring-primary/20";
    if (hasError) {
        fieldClass = "border-red-300 focus:border-red-400 focus:ring-red-100";
    }

    let counterClass = "text-muted";
    if (maxLength !== undefined && value.length > maxLength) {
        counterClass = "text-red-600";
    }

    return (
        <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
            <textarea
                value={value}
                rows={rows}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
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
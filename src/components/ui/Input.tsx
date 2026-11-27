import DateInput from "@/components/ui/DateInput";

// Un champ de formulaire avec son étiquette.
// type="date" donne un champ date en français (jj/mm/aaaa) : la valeur reste « AAAA-MM-JJ ».
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
    disabled?: boolean; // champ grisé (non modifiable)
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
    disabled = false,
}: InputProps) {
    // Les dates ont leur propre champ (saisie « 23/12/2026 » + calendrier)
    if (type === "date") {
        return <DateInput label={label} value={value} onChange={onChange} onBlur={onBlur} error={error} />;
    }

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
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                disabled={disabled}
                className={
                    "block w-full rounded-lg border bg-white px-3 py-2.5 text-ink disabled:cursor-not-allowed disabled:bg-page disabled:text-muted transition-shadow duration-200 placeholder:text-muted/45 focus:ring-2 focus:outline-none " +
                    fieldClass
                }
            />
            {/* Ligne toujours présente (même vide) : l'erreur prend la place déjà réservée,
                le formulaire ne s'étire donc plus quand elle apparaît. */}
            <span className="mt-1 mb-1 flex min-h-4 gap-2 text-xs leading-4">
                {hasError && <span className="animate-fade-in text-red-600">{error}</span>}
                {maxLength !== undefined && (
                    <span className={"ml-auto " + counterClass}>
                        {value.length} / {maxLength}
                    </span>
                )}
            </span>
        </label>
    );
}
// Un champ de formulaire avec son étiquette.
// Si "error" n'est pas vide : bordure rouge clair et message sous le champ.
interface InputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void; // appelée quand on quitte le champ
    error?: string;
    type?: string;
    placeholder?: string;
}

export default function Input({
    label,
    value,
    onChange,
    onBlur,
    error = "",
    type = "text",
    placeholder = "",
}: InputProps) {
    const hasError = error !== "";

    // Couleurs de la bordure et du halo quand on clique dans le champ
    let fieldClass = "border-accent focus:border-primary focus:ring-accent/40";
    if (hasError) {
        fieldClass = "border-red-300 focus:border-red-400 focus:ring-red-100";
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
                    "block w-full rounded-lg border bg-white px-3 py-2 text-ink placeholder:text-ink/40 focus:ring-2 focus:outline-none " +
                    fieldClass
                }
            />
            {hasError && <span className="mt-1 block text-xs text-red-600">{error}</span>}
        </label>
    );
}
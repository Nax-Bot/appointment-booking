// Une case à cocher avec son texte.
interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export default function Checkbox({ label, checked, onChange }: CheckboxProps) {
    return (
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-line accent-primary"
            />
            {label}
        </label>
    );
}
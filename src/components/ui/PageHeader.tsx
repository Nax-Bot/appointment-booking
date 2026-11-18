import { ReactNode } from "react";

// L'en-tête de page, le même partout : le titre, un court texte d'aide dessous,
// les boutons d'action à droite, et un trait de séparation en bas.
// eyebrow = une petite ligne au-dessus du titre (une date, par exemple).
// actions = les boutons (ils passent sous le titre sur petit écran).
interface PageHeaderProps {
    title: string;
    description?: ReactNode;
    eyebrow?: string;
    actions?: ReactNode;
}

export default function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
    return (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
            <div className="min-w-0 flex-1 basis-72">
                {eyebrow !== undefined && <p className="mb-1 text-sm font-medium text-muted">{eyebrow}</p>}
                <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
                {description !== undefined && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
                )}
            </div>
            {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}

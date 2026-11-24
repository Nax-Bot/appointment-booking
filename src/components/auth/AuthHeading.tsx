import { ReactNode } from "react";

// Le titre de chaque page d'authentification : titre, phrase d'explication et un trait en dessous.
export default function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
    return (
        <div className="mb-7 border-b border-line pb-5">
            <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
            {children !== undefined && <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>}
        </div>
    );
}

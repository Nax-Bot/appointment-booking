// Des blocs gris animés (effet « shimmer ») qui imitent la forme du contenu à venir.
export function Skeleton({ className = "" }: { className?: string }) {
    return <div aria-hidden="true" className={"skeleton " + className} />;
}

// Une carte-squelette générique : un rond + deux lignes
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
    return (
        <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-2/5" />
                {Array.from({ length: lines }).map((_, index) => (
                    <Skeleton key={index} className={index === 0 ? "h-3.5 w-3/4" : "h-3.5 w-1/2"} />
                ))}
            </div>
        </div>
    );
}

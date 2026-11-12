import { Role } from "@/types/api";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// Le squelette de TOUTE l'application, affiché juste après la connexion :
// il reprend la forme de la barre de navigation et de la première page du rôle.
// Professionnel : colonne à gauche + page « Mon profil ». Client : bandeau en haut (ClientShellSkeleton).
export default function AppShellSkeleton({ role }: { role: Role }) {
    if (role !== "PROFESSIONAL") {
        return <ClientShellSkeleton />;
    }
    const linkCount = 6;

    return (
        <div data-role={role} className="flex min-h-screen flex-col lg:flex-row" aria-busy="true" aria-label="Chargement de votre espace">
            <main className="min-w-0 flex-1 p-6">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-6 flex items-center gap-4">
                        <Skeleton className="h-8 w-56" />
                        <div className="h-px flex-1 bg-line" />
                    </div>

                    <ProProfileSkeleton />
                </div>
            </main>

            {/* La colonne de navigation, à gauche (en haut sur petit écran) */}
            <aside className="order-first border-b border-line bg-white/80 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
                <div className="flex h-full flex-col gap-3 p-3 lg:gap-6 lg:p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Skeleton className="h-9 w-9 rounded-xl" />
                            <Skeleton className="h-5 w-28" />
                        </div>
                        <Skeleton className="h-9 w-9 lg:hidden" />
                    </div>
                    <div className="flex gap-2 overflow-hidden lg:flex-1 lg:flex-col">
                        {Array.from({ length: linkCount }).map((_, index) => (
                            <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-lg lg:w-full" />
                        ))}
                    </div>
                    <div className="hidden space-y-3 lg:block">
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </div>
            </aside>
        </div>
    );
}

// Première page du professionnel : le profil
function ProProfileSkeleton() {
    return (
        <div className="space-y-6">
            <SkeletonCard lines={2} />
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <Skeleton className="mb-4 h-5 w-40" />
                <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
            </div>
        </div>
    );
}

// Squelette du client : bandeau en haut + page d'accueil
function ClientShellSkeleton() {
    return (
        <div data-role="CLIENT" className="flex min-h-screen flex-col" aria-busy="true" aria-label="Chargement de votre espace">
            <header className="border-b border-line/70 bg-white/75">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <Skeleton className="hidden h-5 w-28 sm:block" />
                    <div className="ml-6 flex flex-1 gap-2">
                        <Skeleton className="h-9 w-24 rounded-full" />
                        <Skeleton className="h-9 w-32 rounded-full" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-full" />
                </div>
            </header>
            <main className="flex-1 px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-2/3" />
                        <Skeleton className="mt-4 h-14 w-full rounded-2xl" />
                    </div>
                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        <Skeleton className="h-32 rounded-2xl" />
                        <Skeleton className="h-32 rounded-2xl" />
                        <Skeleton className="h-32 rounded-2xl" />
                    </div>
                </div>
            </main>
        </div>
    );
}

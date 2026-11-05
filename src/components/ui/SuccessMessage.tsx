import { Check } from "lucide-react";

// Un message de réussite (« Profil enregistré »). Si le message est vide, rien ne s'affiche.
export default function SuccessMessage({ message }: { message: string }) {
    if (message === "") {
        return null;
    }

    return (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-tint p-3 text-sm text-primary">
            <Check className="h-4 w-4" strokeWidth={3} />
            {message}
        </div>
    );
}
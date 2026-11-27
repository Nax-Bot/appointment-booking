"use client";

import { useState } from "react";
import { Check } from "lucide-react";

// Un message de réussite (« Profil enregistré »). Si le message est vide, il se referme en douceur.
// Même principe que ErrorMessage : la hauteur s'anime, la page ne saute pas.
export default function SuccessMessage({ message }: { message: string }) {
    const [lastMessage, setLastMessage] = useState(message);
    if (message !== "" && message !== lastMessage) {
        setLastMessage(message);
    }
    const visible = message !== "";

    return (
        <div
            className={
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out " +
                (visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
            }
            aria-hidden={visible === false}
        >
            <div className="min-h-0 overflow-hidden">
                <div className="pb-4">
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-tint p-3 text-sm text-primary">
                        <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
                        {visible ? message : lastMessage}
                    </div>
                </div>
            </div>
        </div>
    );
}

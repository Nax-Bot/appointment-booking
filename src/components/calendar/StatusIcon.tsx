import { CalendarOff, CheckCheck, CircleCheck, CircleX, Clock, UserX } from "lucide-react";

// La petite icône de chaque statut : elle double la couleur (utile si on distingue mal les teintes).
// status = un statut de rendez-vous, ou "absence".
export default function StatusIcon({ status, className = "h-3 w-3" }: { status: string; className?: string }) {
    if (status === "absence") {
        return <CalendarOff className={className} aria-hidden="true" />;
    }
    if (status === "CONFIRMED") {
        return <CircleCheck className={className} aria-hidden="true" />;
    }
    if (status === "PENDING") {
        return <Clock className={className} aria-hidden="true" />;
    }
    if (status === "COMPLETED") {
        return <CheckCheck className={className} aria-hidden="true" />;
    }
    if (status === "NO_SHOW") {
        return <UserX className={className} aria-hidden="true" />;
    }
    return <CircleX className={className} aria-hidden="true" />;
}

"use client";

import { useState } from "react";
import ProfileHeader from "@/components/account/ProfileHeader";
import AccountCard from "@/components/account/AccountCard";

// La page « Mon compte » du client : sa carte de présentation et UNE carte d'informations personnelles.
export default function ClientAccountPage() {
    const [editOpen, setEditOpen] = useState(false);

    return (
        <div className="mx-auto max-w-3xl animate-page-in">
            <ProfileHeader subtitle="Client" onEdit={() => setEditOpen(true)} />
            <AccountCard editOpen={editOpen} onEditOpenChange={setEditOpen} />
        </div>
    );
}

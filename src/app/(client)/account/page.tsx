"use client";

import PageHeader from "@/components/ui/PageHeader";
import PersonalInfoSection from "@/components/account/PersonalInfoSection";
import ChangePasswordSection from "@/components/account/ChangePasswordSection";

// La page « Mon compte » du client : ses informations et son mot de passe.
export default function ClientAccountPage() {
    return (
        <div className="mx-auto max-w-3xl animate-page-in">
            <PageHeader title="Mon compte" description="Gérez vos informations personnelles et votre mot de passe." />
            <PersonalInfoSection />
            <ChangePasswordSection />
        </div>
    );
}

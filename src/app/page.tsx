"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import Button from "@/components/ui/Button";

export default function HomePage() {
  const { user, loading, logout } = useSession();
  const router = useRouter();

  // Personne n'est connecté : on envoie vers la page de connexion
  useEffect(() => {
    if (loading === false && user === null) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading === true || user === null) {
    return <p className="p-8">Chargement...</p>;
  }

  return (
    <div className="m-8 max-w-md rounded-lg border border-green-400 bg-green-100 p-6">
      <p className="font-bold">
        Connecté : {user.firstName} {user.lastName} ({user.role})
      </p>
      <p className="mt-1 text-sm">{user.email}</p>
      <div className="mt-4">
        <Button onClick={logout}>Se déconnecter</Button>
      </div>
    </div>
  );
}
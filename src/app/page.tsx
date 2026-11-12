"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import { getHomePath } from "@/lib/navigation";
import AppShellSkeleton from "@/components/layout/AppShellSkeleton";
import PageLoading from "@/components/ui/PageLoading";

export default function HomePage() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading === true) {
      return;
    }

    if (user === null) {
      router.replace("/login");
    } else {
      router.replace(getHomePath(user.role));
    }
  }, [loading, user, router]);

  // Connecté : on montre déjà le squelette de son espace pendant la redirection
  if (user !== null) {
    return <AppShellSkeleton role={user.role} />;
  }
  return <PageLoading kind="spinner" label="Chargement..." tone="client" />;
}
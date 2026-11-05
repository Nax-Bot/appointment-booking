"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import { getHomePath } from "@/lib/navigation";

// Cette page n'affiche rien : elle envoie chacun vers la bonne page.
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

  return <p className="p-8">Chargement...</p>;
}
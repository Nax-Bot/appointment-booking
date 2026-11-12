"use client"; // Pour utiliser les clients components

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/lib-front/api-client";
import { startProgress, doneProgress } from "@/lib/lib-front/progress";
import { AuthUser, RegisterInput } from "@/types/api";

// Ce que le contexte met à disposition de toutes les pages
interface SessionContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>; // Login a pour type une fonction qui renvoie une AuthUser
    register: (data: RegisterInput) => Promise<AuthUser>; // register a pour type une fonction qui renvoie une AuthUser
    logout: () => Promise<void>; // logout a pour type une fonction qui ne renvoie rien
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * 
 * @param param0 
 * type Props = { children : ReactNode; };
 * function sessionProvider ({ children } : Props )
 * 
 */
export function SessionProvider({ children }: { children: ReactNode }) {
    /**
     * useState = React hook
     * retourne un tableau de 2 éléments : la valeur actuelle et une fonction pour la mettre à jour
     * <AuthUser | null> = le type de la valeur actuelle (peut être AuthUser ou null)
     * useState<AuthUser | null>(null) = initialisation de la valeur actuelle à null
     */
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadUser() {
            try {
                const me = await apiGet<AuthUser>("/api/auth/me");
                setUser(me);
            } catch (error) {
                setUser(null);
                const isNotLoggedIn = error instanceof ApiError && error.statusCode === 401;
                if (isNotLoggedIn === false) {
                    console.error(error);
                }
            }
            setLoading(false);

        }
        loadUser();
    }, []);

    // Les erreurs (ApiError) ne sont pas attrapées ici : c'est la page qui les affiche
    async function login(email: string, password: string): Promise<AuthUser> {
        startProgress(); // la barre de chargement démarre au clic sur « Se connecter »
        try {
            const loggedUser = await apiPost<AuthUser>("/api/auth/login", {
                email,
                password
            });
            setUser(loggedUser);
            return loggedUser;
        } catch (error) {
            doneProgress(true);
            throw error;
        }
    }

    async function register(data: RegisterInput): Promise<AuthUser> {
        startProgress();
        try {
            const registeredUser = await apiPost<AuthUser>("/api/auth/register", data);
            setUser(registeredUser);
            return registeredUser;
        } catch (error) {
            doneProgress(true);
            throw error;
        }
    }

    async function logout(): Promise<void> {
        await apiPost("/api/auth/logout", {});
        setUser(null);
    }

    const value: SessionContextValue = {
        user: user,
        loading: loading,
        login: login,
        register: register,
        logout: logout
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}

// Les pages appellent useSession() pour lire la session
export function useSession(): SessionContextValue {
    const context = useContext(SessionContext);
    if (context === null) {
        throw new Error("useSession doit etre utilisé dans un SessionProvider");
    }
    return context;
}
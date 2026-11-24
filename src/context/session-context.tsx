"use client"; // Pour utiliser les clients components

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/client/api-client";
import { startProgress, doneProgress } from "@/lib/client/ui/progress";
import { AuthUser, RegisterInput, RegisterResult } from "@/types/api";

// Ce que le contexte met à disposition de toutes les pages
interface SessionContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>; // Login a pour type une fonction qui renvoie une AuthUser
    register: (data: RegisterInput) => Promise<RegisterResult>; // renvoie user = null tant que l'e-mail n'est pas vérifié
    verifyEmail: (email: string, code: string) => Promise<AuthUser>; // vérifie le code reçu par e-mail puis ouvre la session
    resendCode: (email: string) => Promise<void>; // demande un nouveau code
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

    async function register(data: RegisterInput): Promise<RegisterResult> {
        startProgress();
        try {
            const result = await apiPost<RegisterResult>("/api/auth/register", data);
            // Si l'e-mail doit être vérifié, il n'y a pas encore de session : on ne connecte personne
            if (result.user !== null) {
                setUser(result.user);
            }
            return result;
        } catch (error) {
            doneProgress(true);
            throw error;
        }
    }

    async function verifyEmail(email: string, code: string): Promise<AuthUser> {
        startProgress();
        try {
            const verifiedUser = await apiPost<AuthUser>("/api/auth/verify-email", { email, code });
            setUser(verifiedUser);
            return verifiedUser;
        } catch (error) {
            doneProgress(true);
            throw error;
        }
    }

    // La réponse est toujours la même (que le compte existe ou non) : on n'en tire rien
    async function resendCode(email: string): Promise<void> {
        await apiPost("/api/auth/resend-code", { email });
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
        verifyEmail: verifyEmail,
        resendCode: resendCode,
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
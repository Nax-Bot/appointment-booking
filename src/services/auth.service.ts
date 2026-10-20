import { UserRepository, NewUserData } from "@/repositories/user.repository";
import { hashPassword, verifyPassword, Role } from "@/lib/auth";
import { ConflictError, UnauthorizedError } from "@/lib/errors";

// Pour l'inscription
export interface RegisterData {
    role: Role;
    lastName: string;
    firstName: string;
    email: string;
    password: string;
    phoneNumber?: string;
}

// Pour la connexion
export interface LoginData {
    email: string;
    password: string;
}

// Donnée renvoyé pour l'utilisateur
export interface AuthUser {
    userId: number;
    lastName: string;
    firstName: string;
    email: string;
    phoneNumber?: string | null;
    role: Role;
}

// Forme minimale d'un utilisateur
interface UserWithProfiles {
    userId: number;
    lastName: string;
    firstName: string;
    email: string;
    phoneNumber: string | null;
    client: object | null;
    professional: object | null;
}

export class AuthService {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    async register(data: RegisterData): Promise<AuthUser> {
        // Email -> un seul compte
        const existingUser = await this.userRepository.findByEmail(data.email);

        // Ajout d'une erreur [ARRETE LE CODE]pour etre remonter au fichier parent
        if (existingUser) {
            throw new ConflictError("Cet email est deja utilisé");
        }

        const passwordHash = await hashPassword(data.password);

        let phoneNumber: string | null = null;
        if (data.phoneNumber) {
            phoneNumber = data.phoneNumber;
        }

        const newUserData: NewUserData = {
            lastName: data.lastName,
            firstName: data.firstName,
            email: data.email,
            passwordHash: passwordHash,
            phoneNumber: phoneNumber,
        };

        try {
            if (data.role === "CLIENT") {
                const clientUser = await this.userRepository.createClientUser(newUserData);
                return this.toAuthUser(clientUser);
            }

            const professionalUser = await this.userRepository.createClientUser(newUserData);
            return this.toAuthUser(professionalUser);
        } catch (error) {
            // Cas rare : deux inscriptions avec le même email au même instant
            if (this.isUniqueConstraintError(error)) {
                throw new ConflictError("Cet email est déjà utilisé");
            }
            throw error;
        }
    }

    async login(data: LoginData): Promise<AuthUser> {
        const user = await this.userRepository.findByEmail(data.email);

        // Même message dans les deux cas pour ne pas révéler si l'email existe
        if (!user) {
            throw new UnauthorizedError("Email ou mot de passe incorrect");
        }

        const passwordIsCorrect = await verifyPassword(data.password, user.passwordHash);
        if (!passwordIsCorrect) {
            throw new UnauthorizedError("Email ou mot de passe incorrect");
        }

        return this.toAuthUser(user);
    }

    async getMe(userId: number): Promise<AuthUser> {
        const user = await this.userRepository.findById(userId);

        // Le cookie existe mais le compte a ete supprime entre-temps
        if (!user) {
            throw new UnauthorizedError("Session invalide");
        }
        return this.toAuthUser(user);
    }

    // Le rôle se déduit de la fiche liée : client ou professionnel
    private getRole(user: UserWithProfiles): Role {
        if (user.client !== null) {
            return "CLIENT";
        }
        if (user.professional !== null) {
            return "PROFESSIONAL";
        }
        throw new UnauthorizedError("Ce compte n'a aucun rôle");
    }

    // Transforme un utilisateur de la base en AuthUser (sans le hash)
    private toAuthUser(user: UserWithProfiles): AuthUser {
        return {
            userId: user.userId,
            lastName: user.lastName,
            firstName: user.firstName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: this.getRole(user),
        };
    }

    // P2002 est le code de Prisma pour une contrainte d'unicité violée
    private isUniqueConstraintError(error: unknown): boolean {
        if (error === null || typeof error !== "object") {
            return false;
        }
        const prismaError = error as { code?: string };
        return prismaError.code === "P2002";
    }
}
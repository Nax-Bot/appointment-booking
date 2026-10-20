import { UserRepository, NewUserData } from "@/repositories/user.repository";
import { hashPassword, verifyPassword,Role } from "@/lib/auth";
import { ConflictError,UnauthorizedError } from "@/lib/errors";

export interface RegisterData {
    role:Role;
    lastName:string;
    firstName:string;
    email:string;
    password:string;
    phoneNumber?:string;
}

export interface LoginData {
    email: string;
    password:string;
}

export interface AuthUser {
    
}
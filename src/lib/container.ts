// Le container : le SEUL endroit où l'on fait des "new".
// Ordre : repositories, puis services, puis controllers.

import { UserRepository } from "@/repositories/user.repository";
import { AuthService } from "@/services/auth.service";
import { AuthController } from "@/controllers/auth.controller";

// Repositories
const userRepository = new UserRepository();

// Services
const authService = new AuthService(userRepository);

// Controllers (les seuls objets exportés)
export const authController = new AuthController(authService);
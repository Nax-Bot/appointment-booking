import { AuthService, RegisterData } from "../../services/auth.service";
import type { UserRepository } from "../../repositories/user.repository";
import { hashPassword, verifyPassword } from "../../lib/auth";
import { ConflictError, UnauthorizedError } from "@/lib/errors";


/**
 * CYCLE DE VIE D'UN MOCK : ESPION
 * 
 * DEFINITION : jest.fn() / jest.mock()
 * CONFIGURATION : mockResolvedValue(),mockImplementation()
 * UTILISATION : lors du test
 * 
 * CONSERVATION DES ETATS : appels + comportements
 * 
 * REINITIALISATION : retour d'un etat propreN
 * 
 */


// On mocke le module de UserRepository
jest.mock("../../repositories/user.repository", () => ({}));
jest.mock("../../lib/auth", () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
}))

// Declaration d'un type personnalisée
type FakeUserRepository = {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    createClientUser: jest.Mock;
    createProfessionalUser: jest.Mock;
};

let fakeRepository: FakeUserRepository;

// Declaration des variables
let authService: AuthService;

// Definition des hashPassword + verifyPassword en mock
let mockHashPassword = jest.mocked(hashPassword);
let mockVerifyPassword = jest.mocked(verifyPassword);

function makeClientRow() {
    return {
        userId: 1,
        lastName: "Rakoto",
        firstName: "Rina",
        email: "rina@gmail.com",
        passwordHash: "hash-en-base",
        phoneNumber: null,
        client: { userId: 1 },
        professional: null,
    }
}

function makeProfessionalRow() {
    return {
        userId: 2,
        lastName: "Randria",
        firstName: "Tojo",
        email: "tojo@gmail.com",
        passwordHash: "hash-en-base",
        phoneNumber: "0340000000",
        client: null,
        professional: { userId: 2 },
    };
}

const clientInput: RegisterData = {
    role: "CLIENT",
    lastName: "Rakoto",
    firstName: "Rina",
    email: "rina@gmail.com",
    password: "motdepasse123",
};

const professionalInput: RegisterData = {
    role: "PROFESSIONAL",
    lastName: "Randria",
    firstName: "Tojo",
    email: "tojo@gmail.com",
    password: "motdepasse123",
};

// Code lancé à chaque test 
beforeEach(() => {
    // Nettoie les appels + les comportements
    jest.resetAllMocks();

    // declare que hashPassword soit un mock qui retourne une valeur "hash-bidon"
    // Pour eviter de gerer une hashage de mot de passe reel
    mockHashPassword.mockResolvedValue("motdepasse-hasher");
    // True par defaut
    mockVerifyPassword.mockResolvedValue(true);

    // jest.fn() => on mocke les fonctions
    fakeRepository = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        createClientUser: jest.fn(),
        createProfessionalUser: jest.fn(),
    };

    // Initialisation des variables
    authService = new AuthService(fakeRepository as unknown as UserRepository);
})

describe("AuthService.register", () => {
    test("inscrit un client et renvoie son role", async () => {
        // Defini ce que les mocks retourne
        fakeRepository.findByEmail.mockResolvedValue(null);
        fakeRepository.createClientUser.mockResolvedValue(makeClientRow());
        const result = await authService.register(clientInput);

        expect(result).toEqual({
            userId: 1,
            lastName: "Rakoto",
            firstName: "Rina",
            email: "rina@gmail.com",
            phoneNumber: null,
            role: "CLIENT"
        })
    })

    test("inscrit un professionel, avec une fiche professionel", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);
        fakeRepository.createProfessionalUser.mockResolvedValue(makeProfessionalRow());

        const result = await authService.register(professionalInput);

        expect(result.role).toBe("PROFESSIONAL")
        expect(fakeRepository.createProfessionalUser).toHaveBeenCalledTimes(1);
        expect(fakeRepository.createClientUser).not.toHaveBeenCalled();
    })

    test("Recupere le numero de telephone si fourni", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);
        fakeRepository.createClientUser.mockResolvedValue(makeClientRow());

        await authService.register({ ...clientInput, phoneNumber: "0340000000" });

        expect(fakeRepository.createClientUser).toHaveBeenCalledWith(
            // L'objet contient cette propriété
            expect.objectContaining({ phoneNumber: "0340000000" })
        )
    })


    test("Traite un numero de telephone vide comme absent", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);
        // Renvoie la valeur retournée depuis la fakeRepo
        fakeRepository.createClientUser.mockResolvedValue(makeClientRow());

        await authService.register({ ...clientInput, phoneNumber: "" });

        expect(fakeRepository.createClientUser).toHaveBeenCalledWith(
            expect.objectContaining({ phoneNumber: null })
        )
    })

    test("refuse un email deja utilisé , sans hacher ni creer", async () => {
        // Retourne un client
        fakeRepository.findByEmail.mockResolvedValue(makeClientRow());

        await expect(authService.register(clientInput)).rejects.toThrow(ConflictError);
        await expect(authService.register(clientInput)).rejects.toMatchObject({ statusCode: 409 });

        // hashPassword n'est pas appelée
        expect(hashPassword).not.toHaveBeenCalled();
        expect(fakeRepository.createClientUser).not.toHaveBeenCalled();
    })


    test("envoie au repository l'empreinte du mot de passe , jamais le mot de passe", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);
        fakeRepository.createClientUser.mockResolvedValue(makeClientRow());

        await authService.register(clientInput);

        // Appelé 1 seul fois
        expect(hashPassword).toHaveBeenCalledTimes(1);
        // Appele avec cette argument
        expect(hashPassword).toHaveBeenCalledWith("motdepasse123");
        // C'est le mot de passe hasher qui createClientUser recupere
        expect(fakeRepository.createClientUser).toHaveBeenCalledWith({
            lastName: "Rakoto",
            firstName: "Rina",
            email: "rina@gmail.com",
            passwordHash: "motdepasse-hasher",
            phoneNumber: null,
        })
    })

    test("Ne renvoie jamais l'empreint de mot de passe", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);
        fakeRepository.createClientUser.mockResolvedValue(makeClientRow());

        const result = await authService.register(clientInput);

        expect(result).not.toHaveProperty("passwordHash");
    })

    test("Transforme un doublon d'email simultané (P2002) en conflit", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);

        fakeRepository.createClientUser.mockRejectedValue({ code: "P2002" });

        await expect(authService.register(clientInput)).rejects.toThrow(ConflictError);
    })

    test("relance toute autre erreur de la base sans la transformer", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);
        // Rejected lorsqu'on renvoie une Erreur
        fakeRepository.createClientUser.mockRejectedValue(new Error("panne de base"));

        await expect(authService.register(clientInput)).rejects.toThrow("panne de base");
    });

})

describe("AuthService.login", () => {
    test("Renvoie l'utilisateur si l'email et le mot de passe sont corrects", async () => {
        fakeRepository.findByEmail.mockResolvedValue(makeClientRow());

        const result = await authService.login({
            email: "rina@gmail.com",
            password: "motdepasse123"
        })

        expect(result.userId).toBe(1);
        expect(result.role).toBe("CLIENT");
        expect(verifyPassword).toHaveBeenCalledWith("motdepasse123", "hash-en-base");
    })

    test("Refuse un email inconnu,sans comparer de mot de passe", async () => {
        fakeRepository.findByEmail.mockResolvedValue(null);

        await expect(authService.login({
            email: "rina@gmail.com",
            password: "motdepasse123"
        })).rejects.toThrow(UnauthorizedError);

        expect(verifyPassword).not.toHaveBeenCalled();
    })

    test("Refuse un mauvais mot de passe", async () => {
        fakeRepository.findByEmail.mockResolvedValue(makeClientRow());
        mockVerifyPassword.mockResolvedValue(false);

        await expect(authService.login({
            email: "rina@gmail.com",
            password: "motdepasse123"
        })).rejects.toThrow(UnauthorizedError);
    })

    // Dans le test on est pas limite a faire le memes schema de code
    test("Renvoie le meme message pour un email inconnu et un mauvais mot de passe", async () => {
        // Arrange
        fakeRepository.findByEmail.mockResolvedValue(null);
        let unknownEmailMessage = "";

        // Act
        try {
            await authService.login({
                email: "rina@gmail.com",
                password: "motdepasse123"
            })
        } catch (error) {
            unknownEmailMessage = (error as Error).message
        }

        fakeRepository.findByEmail.mockResolvedValue(makeClientRow());
        mockVerifyPassword.mockResolvedValue(false);
        let unknownPasswordMessage = "";

        try {
            await authService.login({
                email: "rina@gmail.com",
                password: "motdepasse123"
            })
        } catch (error) {
            unknownPasswordMessage = (error as Error).message;
        }

        expect(unknownEmailMessage).not.toBe("");
        expect(unknownEmailMessage).toBe(unknownPasswordMessage);
    })
})

describe("AuthService.getMe", () => {
    test("renvoie l'utilisateur de la session avec son role", async () => {
        fakeRepository.findById.mockResolvedValue(makeClientRow());

        const result = await authService.getMe(1);

        expect(fakeRepository.findById).toHaveBeenCalledWith(1);

        expect(result.userId).toBe(1);
        expect(result.role).toBe("CLIENT");

    })

    test("Refuse une session dont le compte n'existe plus", async () => {
        fakeRepository.findById.mockResolvedValue(null);

        // Rejects => Echecs
        await expect(authService.getMe(1)).rejects.toThrow(UnauthorizedError);
    })

    test("Refuse un compte qui n'a aucune fiche , donc aucun role", async () => {
        fakeRepository.findById.mockResolvedValue({
            ...makeClientRow(),
            client: null,
            professional: null
        });

        await expect(authService.getMe(1)).rejects.toThrow(UnauthorizedError);
    })
})

// ON MET DANS LE DOSSIER RACINE DIRECTEMENT A COTE DU FICHIER .ENV
// INSTRUCTION : npx tsx --env-file=.env test-user-repo.ts

import { UserRepository } from "@/repositories/user.repository";
import { prisma } from "@/lib/prisma";

async function main() {
    const userRepository = new UserRepository();
    const suffix = String(Date.now());

    // Test 1 : création d'un client
    const clientEmail = "test-repo-client-" + suffix + "@example.com";
    const newClient = await userRepository.createClientUser({
        lastName: "Rakoto",
        firstName: "Rina",
        email: clientEmail,
        passwordHash: "hash-bidon",
        phoneNumber: null,
    });
    console.log("Client créé : id " + newClient.userId + ", email " + newClient.email);
    console.log("  -> a une fiche client : " + (newClient.client !== null));
    console.log("  -> a une fiche professionnel : " + (newClient.professional !== null));

    // Test 2 : recherche par email et par id
    const foundByEmail = await userRepository.findByEmail(clientEmail);
    console.log("Recherche par email : " + (foundByEmail !== null ? "trouvé" : "introuvable"));

    const foundById = await userRepository.findById(newClient.userId);
    console.log("Recherche par id : " + (foundById !== null ? "trouvé" : "introuvable"));

    // Test 3 : email inconnu
    const unknown = await userRepository.findByEmail("inconnu-" + suffix + "@example.com");
    console.log("Email inconnu : " + unknown);

    // Test 4 : création d'un professionnel
    const proEmail = "test-repo-pro-" + suffix + "@example.com";
    const newPro = await userRepository.createProfessionalUser({
        lastName: "Randria",
        firstName: "Tojo",
        email: proEmail,
        passwordHash: "hash-bidon",
        phoneNumber: "0340000000",
    });
    console.log("Professionnel créé : id " + newPro.userId + ", email " + newPro.email);
    console.log("  -> a une fiche client : " + (newPro.client !== null));
    console.log("  -> a une fiche professionnel : " + (newPro.professional !== null));

    // Nettoyage : on supprime les utilisateurs de test (les fiches partent avec, en cascade)
    const deleted = await prisma.user.deleteMany({
        where: { email: { startsWith: "test-repo-" } },
    });
    console.log("Nettoyage : " + deleted.count + " utilisateurs supprimés");

    await prisma.$disconnect();
}

main();
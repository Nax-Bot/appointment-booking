// ON MET DANS LE DOSSIER RACINE DIRECTEMENT A COTE DU FICHIER .ENV
// INSTRUCTION : npx tsx --env-file=.env test-user-repo.ts

import { hashPassword, verifyPassword, createToken, verifyToken } from "@/lib/auth";

async function main() {
  // Mots de passe
  const hash = await hashPassword("motdepasse123");
  console.log("Test 1 : le hash commence par $2 : " + hash.startsWith("$2"));
  console.log("  -> le hash est différent du mot de passe : " + (hash !== "motdepasse123"));
  console.log("Test 2 : bon mot de passe : " + (await verifyPassword("motdepasse123", hash)));
  console.log("Test 3 : mauvais mot de passe : " + (await verifyPassword("autre", hash)));

  // JWT
  const token = await createToken(42, "CLIENT");
  const session = await verifyToken(token);
  console.log("Test 4 : token valide ->", session);

  // On modifie le contenu du token : la signature ne correspond plus
  const parts = token.split(".");
  const tampered = parts[0] + "." + parts[1] + "A" + "." + parts[2];
  console.log("Test 5 : token modifié ->", await verifyToken(tampered));

  console.log("Test 6 : texte quelconque ->", await verifyToken("pas-un-token"));
}

main();
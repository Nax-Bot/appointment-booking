import { registerSchema, loginSchema } from "../../validations/auth.validation";

// Affiche la liste des problèmes trouvés par zod
function printIssues(result: any) {
  if (result.success) {
    console.log("  -> valide");
    return;
  }
  for (const issue of result.error.issues) {
    console.log("  -> " + issue.path.join(".") + " : " + issue.message);
  }
}

console.log("Test 1 : inscription valide");
const test1 = registerSchema.safeParse({
  role: "CLIENT",
  lastName: "Rakoto",
  firstName: "Rina",
  email: "  Rina@Example.COM ",
  password: "motdepasse123",
});
printIssues(test1);
if (test1.success) {
  console.log("  -> email nettoyé : " + test1.data.email);
}

console.log("Test 2 : email invalide et mot de passe trop court");
printIssues(
  registerSchema.safeParse({
    role: "CLIENT",
    lastName: "Rakoto",
    firstName: "Rina",
    email: "pas-un-email",
    password: "123",
  })
);

console.log("Test 3 : rôle inconnu");
printIssues(
  registerSchema.safeParse({
    role: "ADMIN",
    lastName: "Rakoto",
    firstName: "Rina",
    email: "rina@example.com",
    password: "motdepasse123",
  })
);

console.log("Test 4 : connexion sans mot de passe");
printIssues(loginSchema.safeParse({ email: "rina@example.com" }));
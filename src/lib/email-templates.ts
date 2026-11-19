// Le nom affiché dans les emails : change-le comme tu veux
const APP_NAME = "Prise de rendez-vous";

// Le contenu d'un email : un sujet, un texte simple, et une version HTML
export interface EmailContent {
    subject: string;
    text: string;
    html: string;
}

// Construit l'email qui contient le code de vérification
export function buildVerificationEmail(code: string, lifetimeMinutes: number): EmailContent {
    // Garde-fou : un code a toujours 6 chiffres (cela évite aussi d'insérer du texte inattendu dans le HTML)
    if (/^[0-9]{6}$/.test(code) === false) {
        throw new Error("Le code de vérification doit contenir 6 chiffres");
    }

    const subject = code + " est votre code de vérification - " + APP_NAME;

    const text = [
        "Bonjour,",
        "",
        "Voici votre code de vérification : " + code,
        "",
        "Il est valable " + lifetimeMinutes + " minutes.",
        "",
        "Si vous n'avez pas demandé ce code, ignorez simplement ce message.",
        "Ne partagez jamais ce code : personne n'a besoin de vous le demander.",
        "",
        APP_NAME,
    ].join("\n");

    const html =
        '<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">' +
        '<h2 style="margin: 0 0 16px 0;">Vérifiez votre adresse email</h2>' +
        "<p>Bonjour,</p>" +
        "<p>Voici votre code de vérification :</p>" +
        '<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px;">' +
        code +
        "</p>" +
        "<p>Il est valable <strong>" +
        lifetimeMinutes +
        " minutes</strong>.</p>" +
        '<p style="color: #6b7280; font-size: 14px;">Si vous n\'avez pas demandé ce code, ignorez simplement ce message. ' +
        "Ne partagez jamais ce code : personne n'a besoin de vous le demander.</p>" +
        '<p style="color: #6b7280; font-size: 14px;">' +
        APP_NAME +
        "</p>" +
        "</div>";

    return { subject: subject, text: text, html: html };
}

// Construit l'email envoyé quand quelqu'un essaie de s'inscrire avec une adresse qui a déjà un compte.
// Il ne contient aucun code et aucune donnée saisie par la personne qui a essayé.
export function buildAccountExistsEmail(): EmailContent {
    const subject = "Une inscription a été tentée avec votre adresse - " + APP_NAME;

    const text = [
        "Bonjour,",
        "",
        "Quelqu'un a essayé de créer un compte avec cette adresse email, mais un compte existe déjà.",
        "",
        "Si c'était vous, il suffit de vous connecter avec votre compte existant.",
        "Si ce n'était pas vous, ignorez simplement ce message : votre compte n'a pas été modifié.",
        "",
        APP_NAME,
    ].join("\n");

    const html =
        '<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">' +
        '<h2 style="margin: 0 0 16px 0;">Une inscription a été tentée</h2>' +
        "<p>Bonjour,</p>" +
        "<p>Quelqu'un a essayé de créer un compte avec cette adresse email, mais <strong>un compte existe déjà</strong>.</p>" +
        "<p>Si c'était vous, il suffit de vous connecter avec votre compte existant.</p>" +
        '<p style="color: #6b7280; font-size: 14px;">Si ce n\'était pas vous, ignorez simplement ce message : votre compte n\'a pas été modifié.</p>' +
        '<p style="color: #6b7280; font-size: 14px;">' +
        APP_NAME +
        "</p>" +
        "</div>";

    return { subject: subject, text: text, html: html };
}

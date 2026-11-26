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

// Les informations d'un rendez-vous utiles pour un email
export interface AppointmentEmailInfo {
    appointmentId: number;
    serviceName: string;
    startDatetime: Date;
    professionalName: string;
    clientName: string;
    reason?: string | null;
}

// Les noms viennent des utilisateurs : on neutralise les caractères spéciaux avant de les mettre dans le HTML
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// La date en heure locale de Madagascar, par exemple "lundi 23 novembre 2026 à 14:00"
export function formatLocalDateTime(date: Date): string {
    const day = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Indian/Antananarivo",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
    const time = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Indian/Antananarivo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
    return day + " à " + time;
}

function wrapHtml(title: string, lines: string[]): string {
    return (
        '<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">' +
        '<h2 style="margin: 0 0 16px 0;">' + escapeHtml(title) + "</h2>" +
        lines.map((line) => "<p>" + escapeHtml(line) + "</p>").join("") +
        '<p style="color: #6b7280; font-size: 14px;">' + APP_NAME + "</p>" +
        "</div>"
    );
}

// Email "rendez-vous confirmé" (paiement reçu). audience : à qui on écrit.
export function buildAppointmentConfirmedEmail(info: AppointmentEmailInfo, audience: "CLIENT" | "PROFESSIONAL"): EmailContent {
    const when = formatLocalDateTime(info.startDatetime);
    const subject = "Rendez-vous confirmé le " + when + " - " + APP_NAME;

    const lines =
        audience === "CLIENT"
            ? [
                  "Bonjour " + info.clientName + ",",
                  "Votre paiement a bien été reçu : votre rendez-vous est confirmé.",
                  "Service : " + info.serviceName,
                  "Avec : " + info.professionalName,
                  "Quand : " + when,
              ]
            : [
                  "Bonjour " + info.professionalName + ",",
                  "Un rendez-vous vient d'être confirmé et payé.",
                  "Service : " + info.serviceName,
                  "Client : " + info.clientName,
                  "Quand : " + when,
              ];

    return { subject: subject, text: [...lines, "", APP_NAME].join("\n"), html: wrapHtml("Rendez-vous confirmé", lines) };
}

// Email "rendez-vous annulé". cancelledBy : qui a annulé ; audience : à qui on écrit.
export function buildAppointmentCancelledEmail(
    info: AppointmentEmailInfo,
    audience: "CLIENT" | "PROFESSIONAL",
    cancelledBy: "CLIENT" | "PROFESSIONAL" | "SYSTEM"
): EmailContent {
    const when = formatLocalDateTime(info.startDatetime);
    const subject = "Rendez-vous annulé du " + when + " - " + APP_NAME;

    let who = "Le rendez-vous a été annulé automatiquement (paiement non effectué dans le délai).";
    if (cancelledBy === "CLIENT") {
        who = "Le client a annulé ce rendez-vous.";
    } else if (cancelledBy === "PROFESSIONAL") {
        who = "Le professionnel a annulé ce rendez-vous.";
    }

    const greeting = audience === "CLIENT" ? "Bonjour " + info.clientName + "," : "Bonjour " + info.professionalName + ",";
    const lines = [
        greeting,
        who,
        "Service : " + info.serviceName,
        audience === "CLIENT" ? "Avec : " + info.professionalName : "Client : " + info.clientName,
        "Prévu le : " + when,
    ];
    if (info.reason) {
        lines.push("Raison : " + info.reason);
    }

    return { subject: subject, text: [...lines, "", APP_NAME].join("\n"), html: wrapHtml("Rendez-vous annulé", lines) };
}

// Email du code de réinitialisation du mot de passe
export function buildPasswordResetEmail(code: string, lifetimeMinutes: number): EmailContent {
    if (/^[0-9]{6}$/.test(code) === false) {
        throw new Error("Le code de réinitialisation doit contenir 6 chiffres");
    }

    const subject = code + " est votre code de réinitialisation - " + APP_NAME;
    const lines = [
        "Bonjour,",
        "Voici votre code pour réinitialiser votre mot de passe : " + code,
        "Il est valable " + lifetimeMinutes + " minutes.",
        "Si vous n'avez pas fait cette demande, ignorez ce message : votre mot de passe n'a pas été modifié.",
        "Ne partagez jamais ce code.",
    ];
    return { subject: subject, text: [...lines, "", APP_NAME].join("\n"), html: wrapHtml("Réinitialiser votre mot de passe", lines) };
}

// Email envoyé APRÈS un changement de mot de passe : permet de réagir vite si ce n'était pas la bonne personne
export function buildPasswordChangedEmail(): EmailContent {
    const subject = "Votre mot de passe a été modifié - " + APP_NAME;
    const lines = [
        "Bonjour,",
        "Le mot de passe de votre compte vient d'être modifié.",
        "Si c'est bien vous, vous n'avez rien à faire.",
        "Si ce n'est pas vous, utilisez tout de suite « mot de passe oublié » pour reprendre la main sur votre compte.",
    ];
    return { subject: subject, text: [...lines, "", APP_NAME].join("\n"), html: wrapHtml("Mot de passe modifié", lines) };
}

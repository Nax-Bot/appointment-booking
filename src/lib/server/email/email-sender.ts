import type { EmailContent } from "@/lib/server/email/email-templates";

// Ce que sait faire un "envoyeur d'emails".
// Les services ne connaissent que cette interface : on peut changer le vrai service d'envoi
// sans toucher à la logique d'inscription.
export interface EmailSender {
  sendVerificationCode(email: string, code: string): Promise<void>;

  // Prévient le propriétaire d'une adresse que quelqu'un a essayé de s'inscrire avec elle alors qu'elle a déjà un compte
  sendAccountExistsNotice(email: string): Promise<void>;

  // Envoie un email déjà construit (confirmation ou annulation de rendez-vous...)
  sendNotification(email: string, content: EmailContent): Promise<void>;
}

// Faux envoyeur pour le développement : il affiche le code dans la console du serveur.
// En production il REFUSE de fonctionner, pour que les codes ne s'affichent jamais dans une console de production.
export class ConsoleEmailSender implements EmailSender {
  private isProduction: boolean;

  constructor(isProduction: boolean) {
    this.isProduction = isProduction;
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (this.isProduction) {
      throw new Error("L'envoi factice d'emails est interdit en production : configurez SMTP (EMAIL_SENDER=smtp).");
    }

    console.log("[EMAIL FACTICE] Code de vérification pour " + email + " : " + code);
  }

  async sendAccountExistsNotice(email: string): Promise<void> {
    if (this.isProduction) {
      throw new Error("L'envoi factice d'emails est interdit en production : configurez SMTP (EMAIL_SENDER=smtp).");
    }

    console.log("[EMAIL FACTICE] Avis \"compte déjà existant\" envoyé à " + email);
  }

  async sendNotification(email: string, content: EmailContent): Promise<void> {
    if (this.isProduction) {
      throw new Error("L'envoi factice d'emails est interdit en production : configurez SMTP (EMAIL_SENDER=smtp).");
    }

    console.log("[EMAIL FACTICE] À " + email + " : " + content.subject + "\n" + content.text);
  }
}

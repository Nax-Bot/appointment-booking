// Ce que sait faire un "envoyeur d'emails".
// Les services ne connaissent que cette interface : on pourra changer le vrai service d'envoi
// sans toucher à la logique d'inscription.
export interface EmailSender {
  sendVerificationCode(email: string, code: string): Promise<void>;
}

// Faux envoyeur pour le développement : il affiche le code dans la console du serveur
export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(email: string, code: string): Promise<void> {
    console.log("[EMAIL FACTICE] Code de vérification pour " + email + " : " + code);
  }
}
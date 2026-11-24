import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailSender } from "@/lib/server/email/email-sender";
import type { SmtpConfig } from "@/lib/server/email/smtp-config";
import { buildVerificationEmail, buildAccountExistsEmail } from "@/lib/server/email/email-templates";
import type { EmailContent } from "@/lib/server/email/email-templates";
import { CODE_LIFETIME_MINUTES } from "@/lib/server/auth/verification-code";

// Un vrai envoyeur d'emails, par SMTP
export class SmtpEmailSender implements EmailSender {
    private config: SmtpConfig;

    // Le "transporteur" qui parle au serveur SMTP : créé la première fois qu'on en a besoin, puis gardé
    private transporter: Transporter | null = null;

    constructor(config: SmtpConfig) {
        this.config = config;
    }

    async sendVerificationCode(email: string, code: string): Promise<void> {
        const content = buildVerificationEmail(code, CODE_LIFETIME_MINUTES);
        const transporter = this.getTransporter();

        await transporter.sendMail({
            from: this.config.from,
            to: email,
            subject: content.subject,
            text: content.text,
            html: content.html,
        });
    }

    async sendAccountExistsNotice(email: string): Promise<void> {
        const content = buildAccountExistsEmail();
        const transporter = this.getTransporter();

        await transporter.sendMail({
            from: this.config.from,
            to: email,
            subject: content.subject,
            text: content.text,
            html: content.html,
        });
    }

    async sendNotification(email: string, content: EmailContent): Promise<void> {
        const transporter = this.getTransporter();

        await transporter.sendMail({
            from: this.config.from,
            to: email,
            subject: content.subject,
            text: content.text,
            html: content.html,
        });
    }

    private getTransporter(): Transporter {
        if (this.transporter === null) {
            this.transporter = nodemailer.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: { user: this.config.user, pass: this.config.password },
                // Des délais maximaux (en millisecondes) : sans eux, une panne ferait attendre l'inscription très longtemps
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
            });
        }

        return this.transporter;
    }
}
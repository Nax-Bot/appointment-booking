// Crée un lien de paiement de test. Lancer :  npx tsx scripts/papi-test.ts
// Lit PAPI_API_KEY et APP_PUBLIC_URL dans l'environnement (voir le .env).
import { PapiGateway } from "../lib/payments/papi-gateway";

async function main() {
    const apiKey = process.env.PAPI_API_KEY;
    const publicUrl = process.env.APP_PUBLIC_URL;
    if (!apiKey || !publicUrl) {
        throw new Error("PAPI_API_KEY et APP_PUBLIC_URL doivent être définis");
    }

    const gateway = new PapiGateway();
    const link = await gateway.createPaymentLink(
        { apiKey },
        {
            reference: "test-" + Date.now(),
            amount: 1000,
            description: "Test de paiement",
            clientName: "Client Test",
            notificationUrl: publicUrl + "/api/payments/papi/test-notify",
            validDurationHours: 1,
        }
    );
    console.log("Ouvrez ce lien dans le navigateur :", link.paymentUrl);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

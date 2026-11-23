import { NextResponse } from "next/server";
import { verifyPapiSignature } from "../../../../../lib/payments/papi-signature";

// ROUTE TEMPORAIRE pour le premier test : elle vérifie la signature et affiche la notification.
// Elle ne touche pas à la base de données. Elle sera remplacée par la vraie route.
export async function POST(req: Request) {
    // Le corps BRUT : indispensable pour la signature (ne jamais faire req.json() avant)
    const rawBody = await req.text();
    const signature = req.headers.get("x-papi-signature");
    const secret = process.env.PAPI_WEBHOOK_SECRET ?? "";

    if (verifyPapiSignature(rawBody, signature, secret) === false) {
        console.warn("[papi test] signature INVALIDE");
        return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    console.log("[papi test] notification valide :", rawBody);
    return NextResponse.json({ ok: true });
}

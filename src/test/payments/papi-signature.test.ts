import { createHmac } from "crypto";
import { verifyPapiSignature } from "../../lib/payments/papi-signature";

const SECRET = "pwhsec_" + "a".repeat(64);
const BODY = '{"paymentStatus":"SUCCESS","amount":1000}';

function sign(t: number, body: string, secret: string = SECRET) {
    const v1 = createHmac("sha256", secret).update(t + "." + body).digest("hex");
    return "t=" + t + ",v1=" + v1;
}

describe("verifyPapiSignature", () => {
    const now = 1_800_000_000;

    it("accepte une signature correcte", () => {
        expect(verifyPapiSignature(BODY, sign(now, BODY), SECRET, 300, now)).toBe(true);
    });
    it("refuse un corps modifié", () => {
        expect(verifyPapiSignature(BODY + " ", sign(now, BODY), SECRET, 300, now)).toBe(false);
    });
    it("refuse un mauvais secret", () => {
        expect(verifyPapiSignature(BODY, sign(now, BODY, "pwhsec_" + "b".repeat(64)), SECRET, 300, now)).toBe(false);
    });
    it("refuse une notification trop ancienne", () => {
        expect(verifyPapiSignature(BODY, sign(now - 301, BODY), SECRET, 300, now)).toBe(false);
    });
    it("accepte une notification ancienne si la tolérance est 0", () => {
        expect(verifyPapiSignature(BODY, sign(now - 9999, BODY), SECRET, 0, now)).toBe(true);
    });
    it("refuse un en-tête absent ou mal formé", () => {
        expect(verifyPapiSignature(BODY, null, SECRET, 300, now)).toBe(false);
        expect(verifyPapiSignature(BODY, "n'importe quoi", SECRET, 300, now)).toBe(false);
        expect(verifyPapiSignature(BODY, "t=abc,v1=zz", SECRET, 300, now)).toBe(false);
    });
    it("refuse si le secret est vide", () => {
        expect(verifyPapiSignature(BODY, sign(now, BODY, ""), "", 300, now)).toBe(false);
    });
});

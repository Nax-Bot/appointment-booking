import { BaseController } from "@/controllers/base.controller";
import { PaymentService } from "@/services/payment.service";
import { setupPaymentAccountSchema } from "@/validations/payment.validation";
import { jsonOk } from "@/lib/http";

export class PaymentController extends BaseController {
    private paymentService: PaymentService;

    constructor(paymentService: PaymentService) {
        super();
        this.paymentService = paymentService;
    }

    // PUT /api/professionals/me/payment-account : enregistrer sa boutique Papi
    async setupAccount(req: Request) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const data = await this.readAndValidateBody(req, setupPaymentAccountSchema);
            const account = await this.paymentService.setupAccount(session.userId, data);
            return this.ok(account);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/professionals/me/payment-account : ma boutique est-elle configurée ?
    async getAccountStatus() {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const status = await this.paymentService.getAccountStatus(session.userId);
            return this.ok(status);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/appointments/[id]/pay : le client obtient le lien pour payer
    async startPayment(idText: string) {
        try {
            const session = await this.requireSession("CLIENT");
            const appointmentId = this.parseId(idText);
            const result = await this.paymentService.startPayment(session.userId, appointmentId);
            return this.ok(result);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/payments/papi/notify/[accountId] : appelée par Papi (route publique, protégée par la signature)
    async notify(req: Request, accountIdText: string) {
        try {
            const accountId = this.parseId(accountIdText);
            // Le corps BRUT, indispensable pour vérifier la signature
            const rawBody = await req.text();
            const signature = req.headers.get("x-papi-signature");
            const result = await this.paymentService.handleNotification(accountId, rawBody, signature);
            return jsonOk({ result: result });
        } catch (error) {
            return this.handleError(error);
        }
    }
}

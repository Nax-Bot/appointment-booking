"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { apiGet, apiPut, ApiError } from "@/lib/client/api-client";
import { PaymentAccountResult, PaymentAccountStatus, SetupPaymentAccountInput } from "@/types/payment";
import { WEBHOOK_SECRET_PATTERN } from "@/lib/client/payment-rules";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import { Skeleton } from "@/components/ui/Skeleton";

// La carte « Paiement en ligne » de la page Profil du professionnel.
// Elle dit si la boutique Papi est configurée, et permet de l'enregistrer ou de la remplacer.
// Les clés partent vers le backend et ne sont jamais réaffichées (le backend ne les renvoie pas).
export default function PaymentAccountSection() {
    const [status, setStatus] = useState<PaymentAccountStatus | null>(null);
    const [loadError, setLoadError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [boutiqueCode, setBoutiqueCode] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [webhookSecret, setWebhookSecret] = useState("");
    const [touched, setTouched] = useState({ boutiqueCode: false, apiKey: false, webhookSecret: false });

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const result = await apiGet<PaymentAccountStatus>("/api/professionals/me/payment-account");
                if (cancelled === false) {
                    setStatus(result);
                }
            } catch (error) {
                if (cancelled === false) {
                    setLoadError(error instanceof ApiError ? error.message : "Impossible de lire l'état du paiement");
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Mêmes règles que le backend (validations/payment.validation.ts)
    let codeError = "";
    if (boutiqueCode.trim() === "") {
        codeError = "Le code de la boutique est obligatoire";
    }
    let keyError = "";
    if (apiKey.trim().length < 10) {
        keyError = "Clé API invalide (10 caractères minimum)";
    }
    let secretError = "";
    if (WEBHOOK_SECRET_PATTERN.test(webhookSecret.trim()) === false) {
        secretError = "Le secret doit ressembler à pwhsec_ suivi de 64 caractères (0-9, a-f)";
    }
    const formValid = codeError === "" && keyError === "" && secretError === "";

    function openModal() {
        setBoutiqueCode("");
        setApiKey("");
        setWebhookSecret("");
        setTouched({ boutiqueCode: false, apiKey: false, webhookSecret: false });
        setErrorMessage("");
        setErrorDetails([]);
        setModalOpen(true);
    }

    function closeModal() {
        if (saving) {
            return;
        }
        setModalOpen(false);
        // Les clés ne restent pas en mémoire une fois la fenêtre fermée
        setApiKey("");
        setWebhookSecret("");
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched({ boutiqueCode: true, apiKey: true, webhookSecret: true });
        if (formValid === false) {
            return;
        }

        setErrorMessage("");
        setErrorDetails([]);
        setSaving(true);

        const body: SetupPaymentAccountInput = {
            boutiqueCode: boutiqueCode.trim(),
            apiKey: apiKey.trim(),
            webhookSecret: webhookSecret.trim(),
        };

        try {
            const saved = await apiPut<PaymentAccountResult>("/api/professionals/me/payment-account", body);
            setStatus({ configured: true, boutiqueCode: saved.boutiqueCode });
            setSuccessMessage("Boutique de paiement enregistrée");
            setModalOpen(false);
            setApiKey("");
            setWebhookSecret("");
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }
        setSaving(false);
    }

    const configured = status !== null && status.configured;

    return (
        <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-3">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Paiement en ligne</h2>
                    <p className="text-sm text-muted">
                        Vos clients paient leur rendez-vous avec Papi (MVola, Airtel Money, Orange Money, carte). Le
                        rendez-vous est confirmé dès que le paiement arrive.
                    </p>
                </div>
                {status !== null && (
                    <button
                        type="button"
                        onClick={openModal}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-tint"
                    >
                        <CreditCard className="h-4 w-4" />
                        {configured ? "Remplacer" : "Configurer"}
                    </button>
                )}
            </div>

            <SuccessMessage message={successMessage} />
            <ErrorMessage message={loadError} />

            {status === null && loadError === "" && <Skeleton className="h-12 w-full" />}

            {status !== null && configured && (
                <div className="flex items-center gap-3 rounded-xl bg-tint p-4">
                    <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
                    <div>
                        <p className="font-medium text-ink">Paiement en ligne activé</p>
                        <p className="text-sm text-muted">
                            Boutique : <span className="font-medium text-ink">{status.boutiqueCode}</span>
                        </p>
                    </div>
                </div>
            )}

            {status !== null && configured === false && (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-medium">Paiement en ligne non configuré</p>
                    <p className="mt-0.5">
                        Tant que votre boutique n&apos;est pas enregistrée, vos clients ne peuvent pas payer, et leurs
                        réservations restent en attente puis sont libérées au bout d&apos;une heure.
                    </p>
                </div>
            )}

            <Modal open={modalOpen} title={configured ? "Remplacer ma boutique" : "Configurer ma boutique"} onClose={closeModal}>
                <form onSubmit={handleSubmit}>
                    <ErrorMessage message={errorMessage} details={errorDetails} />

                    <p className="mb-4 text-sm text-muted">
                        Ces informations se trouvent dans votre compte Papi. Elles sont chiffrées et ne seront plus
                        jamais affichées.
                        {configured && " L'ancienne boutique ne sera plus utilisée."}
                    </p>

                    <Input
                        label="Code de la boutique"
                        placeholder="Ex. MA-BOUTIQUE"
                        value={boutiqueCode}
                        onChange={setBoutiqueCode}
                        onBlur={() => setTouched({ ...touched, boutiqueCode: true })}
                        error={touched.boutiqueCode ? codeError : ""}
                        maxLength={50}
                    />
                    <Input
                        label="Clé API"
                        type="password"
                        placeholder="Collez votre clé API"
                        value={apiKey}
                        onChange={setApiKey}
                        onBlur={() => setTouched({ ...touched, apiKey: true })}
                        error={touched.apiKey ? keyError : ""}
                    />
                    <Input
                        label="Secret de signature"
                        type="password"
                        placeholder="pwhsec_..."
                        value={webhookSecret}
                        onChange={setWebhookSecret}
                        onBlur={() => setTouched({ ...touched, webhookSecret: true })}
                        error={touched.webhookSecret ? secretError : ""}
                    />

                    <div className="mt-5 flex justify-end gap-3">
                        <Button variant="secondary" fullWidth={false} disabled={saving} onClick={closeModal}>
                            Annuler
                        </Button>
                        <Button type="submit" fullWidth={false} loading={saving}>
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}

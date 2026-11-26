"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
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

    // Les moyens de paiement proposés par Papi (texte simple, pas de logos de marques)
    const methods = ["MVola", "Airtel Money", "Orange Money", "Carte bancaire"];
    const benefits = [
        "Rendez-vous confirmé dès le paiement",
        "MVola, Airtel Money, Orange Money, carte",
        "Créneau libéré si non payé en 1 heure",
        "Vos clés sont chiffrées, jamais affichées",
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Carte claire : l'état de la boutique et les moyens de paiement */}
            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-ink">Informations de paiement</h2>
                    {status !== null && (
                        <span
                            className={
                                "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                                (configured ? "bg-tint text-primary" : "bg-amber-50 text-amber-800")
                            }
                        >
                            {configured ? "Activé" : "Non configuré"}
                        </span>
                    )}
                </div>

                <SuccessMessage message={successMessage} />
                <ErrorMessage message={loadError} />

                {status === null && loadError === "" && <Skeleton className="h-11 w-full" />}

                {status !== null && (
                    <>
                        <p className="mb-1.5 text-sm text-muted">Boutique Papi</p>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-page px-4 py-3">
                            <span className="truncate font-mono text-sm tracking-wide text-ink">
                                {configured ? "•••• •••• " + status.boutiqueCode : "Aucune boutique enregistrée"}
                            </span>
                            <ShieldCheck className={"h-5 w-5 shrink-0 " + (configured ? "text-primary" : "text-muted/50")} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                            {methods.map((method) => (
                                <div
                                    key={method}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink/80"
                                >
                                    {method === "Carte bancaire" && <CreditCard className="h-4 w-4 text-muted" />}
                                    {method}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            {/* Carte foncée : ce que ça apporte, et le bouton pour configurer */}
            <section className="rounded-2xl bg-deep p-6 text-white shadow-sm">
                <h2 className="text-xl leading-tight font-semibold">
                    Paiement
                    <br />
                    en ligne
                </h2>
                <ul className="mt-4 space-y-2.5">
                    {benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2.5 text-sm text-white/85">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" strokeWidth={3} />
                            {benefit}
                        </li>
                    ))}
                </ul>
                {status !== null && (
                    <button
                        type="button"
                        onClick={openModal}
                        className="mt-6 w-full rounded-xl bg-mint px-4 py-3 text-sm font-semibold text-deep shadow-lg shadow-black/20 transition-all hover:brightness-105 active:scale-[0.98]"
                    >
                        {configured ? "Remplacer ma boutique" : "Configurer ma boutique"}
                    </button>
                )}
                {status !== null && configured === false && (
                    <p className="mt-3 text-xs text-white/60">
                        Sans boutique, les réservations de vos clients sont libérées au bout d&apos;une heure.
                    </p>
                )}
            </section>

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
        </div>
    );
}

import Input from "@/components/ui/Input";

// Les deux champs « Prix » et « Durée » côte à côte.
// Les valeurs restent du texte : c'est la fonction parseNumber qui les transforme en nombres.
interface PriceDurationFieldsProps {
    priceText: string;
    onPriceChange: (value: string) => void;
    priceError: string;
    pricePlaceholder?: string;
    durationText: string;
    onDurationChange: (value: string) => void;
    durationError: string;
    durationPlaceholder?: string;
}

export default function PriceDurationFields({
    priceText,
    onPriceChange,
    priceError,
    pricePlaceholder = "",
    durationText,
    onDurationChange,
    durationError,
    durationPlaceholder = "",
}: PriceDurationFieldsProps) {
    return (
        <div className="grid gap-x-4 sm:grid-cols-2">
            <Input
                label="Prix (Ar)"
                placeholder={pricePlaceholder}
                value={priceText}
                onChange={onPriceChange}
                error={priceError}
            />
            <Input
                label="Durée (minutes)"
                placeholder={durationPlaceholder}
                value={durationText}
                onChange={onDurationChange}
                error={durationError}
            />
        </div>
    );
}
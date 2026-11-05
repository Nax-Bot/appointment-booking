interface ErrorMessageProps {
    message: string;
    details?: string[];
    isDisplay: boolean;
}

export default function ErrorMessage({
    message,
    details = [],
    isDisplay,

}: ErrorMessageProps) {
    if (isDisplay) {
        return (
            <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">{message}</p>
                {
                    details.length > 0 && (
                        <ul className="mt-1 list-disc pl-5">
                            {details.map((detail) => (
                                <li key={detail}>
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    )
                }
            </div>
        )
    }
    return (
        <div></div>
    )

}
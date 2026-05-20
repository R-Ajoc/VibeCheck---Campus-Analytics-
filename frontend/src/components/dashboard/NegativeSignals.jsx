import { AlertCircle } from "lucide-react";

function NegativeSignals({ data = {} }) {
    const getSignalText = (signal) => {
        if (typeof signal === "string") return signal;
        if (signal && typeof signal === "object") return signal.text || signal.label || "Unnamed signal";
        return "Unnamed signal";
    };

    const getSignalSeverityClass = (signal) => {
        const severity = typeof signal === "object" && signal ? signal.severity : null;

        if (severity === "high") return "bg-red-100 text-red-700 border-red-200";
        if (severity === "medium") return "bg-orange-100 text-orange-700 border-orange-200";
        if (severity === "low") return "bg-amber-100 text-amber-700 border-amber-200";

        return "bg-red-50 text-red-900 border-red-100";
    };

    // Handle empty state
    if (data.status === "no_data" || !data.signals || data.signals.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                        Negative Signals
                    </h2>
                </div>
                <p className="text-xs text-gray-400 mb-6">
                    Key operational issues from customer feedback
                </p>

                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">No issues detected</h3>
                    <p className="text-xs text-gray-400">Business feedback appears positive</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">
                    Negative Signals
                </h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
                Key operational issues from customer feedback
            </p>

            {/* Signals list */}
            <div className="space-y-2 mb-4">
                {data.signals.slice(0, 4).map((signal, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${getSignalSeverityClass(signal)}`}
                    >
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-900 ">
                            {getSignalText(signal)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Pattern summary */}
            {data.pattern && (
                <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-600 font-medium mb-1">Pattern</p>
                    <p className="text-sm text-gray-700">
                        {data.pattern}
                    </p>
                </div>
            )}

            {/* Data quality indicator */}
            {data.meta && (
                <div className={`mt-4 pt-4 border-t ${data.meta.is_reliable ? "border-gray-100" : "border-amber-100"}`}>
                    <div className="flex items-start gap-2">
                        {data.meta.is_reliable ? (
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                        <p className={`text-xs font-medium ${data.meta.is_reliable ? "text-green-600" : "text-amber-600"}`}>
                            {data.meta.is_reliable 
                                ? `Reliable analysis (${data.meta.sample_size} reviews)`
                                : `Early signal (${data.meta.sample_size}/${data.meta.minimum} reviews)`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NegativeSignals;

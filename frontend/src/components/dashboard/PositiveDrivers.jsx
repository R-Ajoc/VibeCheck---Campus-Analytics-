import { ThumbsUp } from "lucide-react";

function PositiveDrivers({ data = {} }) {
    // Handle empty state
    if (data.status === "no_data" || !data.driver) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <ThumbsUp className="w-4 h-4 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                        Strengths & Positive Drivers
                    </h2>
                </div>
                <p className="text-xs text-gray-400 mb-6">
                    What customers love about this business
                </p>

                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Not enough data yet</h3>
                    <p className="text-xs text-gray-400">Need more reviews to identify strengths</p>
                </div>
            </div>
        );
    }

    // Impact badge styling
    const impactColors = {
        "STRONG": "bg-green-50 text-green-600",
        "MODERATE": "bg-blue-50 text-[#004687]",
        "WEAK": "bg-gray-50 text-gray-600"
    };

    const impactBgBar = {
        "STRONG": "bg-green-500",
        "MODERATE": "bg-blue-500",
        "WEAK": "bg-gray-400"
    };

    const badgeClass = impactColors[data.impact] || impactColors["MODERATE"];
    const barClass = impactBgBar[data.impact] || impactBgBar["MODERATE"];

    // Data quality assessment (adaptive thresholds applied on backend)
    const isReliable = data.meta?.is_reliable ?? false;
    const sampleSize = data.meta?.sample_size ?? 0;
    const minRequired = data.meta?.minimum ?? 5;
    const dataMaturity = Math.min((sampleSize / (minRequired * 4)) * 100, 100);
    
    const reliabilityColor = isReliable ? "text-green-600" : "text-amber-600";
    const reliabilityBg = isReliable ? "bg-green-50" : "bg-amber-50";

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ThumbsUp className="w-4 h-4 text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Strengths & Positive Drivers
                        </h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        What customers love about this business
                    </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
                    {data.impact}
                </span>
            </div>

            {/* Primary strength driver (large emphasis) */}
            <h3 className="text-3xl font-bold text-gray-900 mb-4 capitalize">
                {data.driver}
            </h3>

            {/* Score progress bar */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600">Strength Score</p>
                    <p className="text-sm font-semibold text-gray-900">
                        {data.score.toFixed(1)}/100
                    </p>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                        style={{ width: `${Math.min(data.score, 100)}%` }}
                    />

                            {/* Data maturity indicator
                            <div className={`mb-5 p-3 rounded-lg border ${reliabilityBg} border-current`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-gray-700">Data Maturity</p>
                                    <p className={`text-xs font-semibold ${reliabilityColor}`}>
                                        {dataMaturity.toFixed(0)}%
                                    </p>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${reliabilityColor.replace('text-', 'bg-')}`}
                                        style={{ width: `${dataMaturity}%` }}
                                    />
                                </div>
                            </div> */}
                </div>
            </div>

            {/* Supporting signals (chips) */}
            {data.signals && data.signals.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Supporting strengths</p>
                    <div className="flex flex-wrap gap-2">
                        {data.signals.slice(0, 4).map((signal, index) => (
                            <span
                                key={index}
                                className="text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-full font-medium border border-green-100"
                            >
                                {signal}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Pattern summary */}
            {data.pattern && (
                <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700">
                        {data.pattern}

                                {/* Early signal warning */}
                                {!isReliable && (
                                    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                        <p className="text-xs text-amber-700 font-medium mb-1">
                                            ℹ️ Early Signal ({sampleSize}/{minRequired} reviews)
                                        </p>
                                        <p className="text-xs text-amber-600">
                                            Thresholds will adjust as more reviews are collected.
                                        </p>
                                    </div>
                                )}
                    </p>
                </div>
            )}
        </div>
    );
}

export default PositiveDrivers;

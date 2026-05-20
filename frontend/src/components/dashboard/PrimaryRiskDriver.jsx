import { AlertTriangle } from "lucide-react";

function PrimaryRiskDriver({ data = {} }) {
    // Handle empty state
    if (data.status === "no_data" || !data.driver) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                        <span>Primary Risk Driver</span>
                    </div>
                </h2>
                <p className="text-xs text-gray-400 mb-6">
                    Most critical issue affecting business perception
                </p>

                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Not enough data yet</h3>
                    <p className="text-xs text-gray-400">Need more reviews to identify key issues</p>
                </div>
            </div>
        );
    }

    // Impact badge styling
    const impactColors = {
        "HIGH": "bg-red-50 text-red-600",
        "MEDIUM": "bg-yellow-50 text-yellow-600",
        "LOW": "bg-blue-50 text-[#004687]"
    };

    const impactBgBar = {
        "HIGH": "bg-red-500",
        "MEDIUM": "bg-yellow-500",
        "LOW": "bg-blue-500"
    };

    const badgeClass = impactColors[data.impact] || impactColors["LOW"];
    const barClass = impactBgBar[data.impact] || impactBgBar["LOW"];

    // Data quality assessment (replaces simple reliability check)
    const isReliable = data.meta?.is_reliable ?? false;
    const sampleSize = data.meta?.sample_size ?? 0;
    const minRequired = data.meta?.minimum ?? 5;
    const dataMaturity = Math.min((sampleSize / (minRequired * 4)) * 100, 100); // Confidence factor as percentage
    
    const reliabilityLabel = isReliable 
        ? `Reliable (${sampleSize} mentions)` 
        : `Early Signal (${sampleSize}/${minRequired} mentions)`;
    const reliabilityColor = isReliable ? "text-green-600" : "text-amber-600";
    const reliabilityBg = isReliable ? "bg-green-50" : "bg-amber-50";

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Primary Risk Driver
                        </h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                       Aspect contributing most to negative guest experience signals
                    </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
                    {data.impact}
                </span>
            </div>

            {/* Risk driver name (large emphasis) */}
            <h3 className="text-3xl font-bold text-gray-900 mb-4 capitalize">
                {data.driver}
            </h3>

            {/* Score progress bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600">Risk Score</p>
                    <p className="text-sm font-semibold text-gray-900">
                        {data.score.toFixed(1)}/100
                    </p>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                        style={{ width: `${Math.min(data.score, 100)}%` }}
                    />
                </div>
            </div>

            {/* Data maturity indicator (shows confidence factor visually)
            <div className={`mb-4 p-3 rounded-lg border ${reliabilityBg} border-current`}>
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

            {/* Reliability status with context */}
            <div className={`pt-4 border-t ${isReliable ? 'border-gray-100' : 'border-amber-100'}`}>
                <div className="flex items-start gap-2">
                    {isReliable ? (
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    )}
                    <p className={`text-xs font-medium ${reliabilityColor}`}>
                        {reliabilityLabel}
                    </p>
                </div>
                {!isReliable && (
                    <p className="text-xs text-amber-600 mt-2">
                        This is an early signal. Thresholds will adjust as more reviews are collected.
                    </p>
                )}
            </div>
        </div>
    );
}

export default PrimaryRiskDriver;

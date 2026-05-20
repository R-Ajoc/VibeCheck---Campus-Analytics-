import React from "react";
import { CheckCircle, AlertTriangle, Info, BarChart2 } from "lucide-react";

/*
Expected backend shape:
vibe: {
  volatility,
  stability,
  interpretation,
  meta
}

sentiment: {
  volatility,
  stability,
  interpretation,
  meta
}
*/

const STATUS = {
    stable: {
        label: "Stable",
        tone: "green",
        Icon: CheckCircle,
    },
    mixed: {
        label: "Mixed",
        tone: "yellow",
        Icon: Info,
    },
    unstable: {
        label: "Unstable",
        tone: "red",
        Icon: AlertTriangle,
    },
    insufficient_data: {
        label: "Insufficient Data",
        tone: "gray",
        Icon: Info,
    }
};

function Badge({ state }) {
    const s = STATUS[state] || STATUS.insufficient_data;

    const base =
        s.tone === "green"
            ? "bg-green-50 text-green-700 border-green-100"
            : s.tone === "red"
            ? "bg-red-50 text-red-700 border-red-100"
            : s.tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-gray-50 text-gray-700 border-gray-100";

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${base}`}>
            <s.Icon className="w-4 h-4" />
            <span>{s.label}</span>
        </span>
    );
}

function StatCard({ title, value, subtitle }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">{value ?? "—"}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    );
}

export default function BusinessStabilityCard({
    vibe = null,
    sentiment = null,
    loading = false
}) {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-6" />
                <div className="h-24 bg-gray-200 rounded mb-4" />
                <div className="h-10 bg-gray-200 rounded" />
            </div>
        );
    }

    const vibeState = vibe?.stability || "insufficient_data";
    const sentimentState = sentiment?.stability || "insufficient_data";

    const isInsufficient =
        vibeState === "insufficient_data" &&
        sentimentState === "insufficient_data";

    // -------------------------
    // Primary insight (NEW)
    // -------------------------
    const primaryInsight =
        vibe?.interpretation ||
        "Not enough data to generate stability insight.";

    // -------------------------
    // Business summary logic
    // -------------------------
    const summaryMap = {
        stable: "Customer experience is consistent. Operations are predictable.",
        mixed: "Some fluctuations detected. Monitor customer feedback patterns.",
        unstable: "Significant inconsistency detected. Review recent changes.",
        insufficient_data: "Not enough data to evaluate stability."
    };

    const combinedState =
        vibeState === "stable" && sentimentState === "stable"
            ? "stable"
            : vibeState === "unstable" || sentimentState === "unstable"
            ? "unstable"
            : vibeState === "mixed" || sentimentState === "mixed"
            ? "mixed"
            : "insufficient_data";

    if (isInsufficient) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <BarChart2 className="w-5 h-5 text-gray-300" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Business Stability
                    </h2>
                </div>

                <div className="h-[160px] flex flex-col justify-center items-center text-center">
                    <p className="text-sm text-gray-600 font-medium">
                        Not enough customer data yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Stability insights will appear once reviews accumulate
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Business Stability
                    </h2>
                    <p className="text-xs text-gray-400">
                        How consistent your customer experience is over time
                    </p>
                </div>

                <Badge state={combinedState} />
            </div>

            {/* Main Insight (MOST IMPORTANT) */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-4">
                <p className="text-sm font-medium text-gray-900">
                    Key Insight
                </p>
                <p className="text-xs text-gray-700 mt-1">
                    {primaryInsight}
                </p>
            </div>

            {/* Metrics (secondary now) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <StatCard
                    title="Business Experience"
                    value={vibeState}
                    subtitle={vibe?.volatility?.toFixed?.(2)}
                />

                <StatCard
                    title="Customer Sentiment"
                    value={sentimentState}
                    subtitle={sentiment?.volatility?.toFixed?.(2)}
                />
            </div>

            {/* Comparison */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">
                    Summary
                </p>
                <p className="text-xs text-gray-600 mt-1">
                    {summaryMap[combinedState]}
                </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                    {vibe?.meta?.sample_size ?? 0} vibe points • {sentiment?.meta?.sample_size ?? 0} sentiment points
                </p>

                <span
                    className={`text-xs px-3 py-1 rounded-full border ${
                        vibe?.meta?.is_reliable && sentiment?.meta?.is_reliable
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-yellow-50 text-yellow-700 border-yellow-100"
                    }`}
                >
                    {vibe?.meta?.is_reliable && sentiment?.meta?.is_reliable
                        ? "Reliable"
                        : "Low Confidence"}
                </span>
            </div>
        </div>
    );
}
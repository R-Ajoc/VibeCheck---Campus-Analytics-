import React from "react";
import {
    AlertTriangle,
    Activity,
    Zap,
    CheckCircle,
    Info,
    TrendingUp,
    MessageCircle
} from "lucide-react";
import ReliabilityFooter from "../ReliabilityFooter";

const URGENCY_BADGE = {
    low: {
        label: "Low Priority",
        color: "text-green-700 bg-green-50 border-green-100",
        Icon: CheckCircle
    },
    low_medium: {
        label: "Monitor",
        color: "text-blue-700 bg-blue-50 border-blue-100",
        Icon: Info
    },
    medium: {
        label: "Watch",
        color: "text-amber-700 bg-amber-50 border-amber-100",
        Icon: Activity
    },
    medium_high: {
        label: "Attention",
        color: "text-orange-700 bg-orange-50 border-orange-100",
        Icon: TrendingUp
    },
    high: {
        label: "Urgent",
        color: "text-red-700 bg-red-50 border-red-100",
        Icon: AlertTriangle
    },
    unknown: {
        label: "No Signal",
        color: "text-gray-700 bg-gray-50 border-gray-100",
        Icon: Info
    },
};

const URGENCY_INSIGHT = {
    low: {
        bg: "bg-green-50 border-green-100 text-green-800",
        Icon: CheckCircle
    },
    low_medium: {
        bg: "bg-blue-50 border-blue-100 text-blue-800",
        Icon: Info
    },
    medium: {
        bg: "bg-amber-50 border-amber-100 text-amber-800",
        Icon: Activity
    },
    medium_high: {
        bg: "bg-orange-50 border-orange-100 text-orange-800",
        Icon: TrendingUp
    },
    high: {
        bg: "bg-red-50 border-red-100 text-red-800",
        Icon: AlertTriangle
    },
    unknown: {
        bg: "bg-gray-50 border-gray-100 text-gray-700",
        Icon: Info
    },
};

function interpretSignal(v) {
    const a = Math.abs(v || 0);
    if (a < 1) return "Stable";
    if (a < 2) return "Shifting";
    return "Changing Fast";
}

function Chip({ label, value }) {
    return (
        <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white">
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-[11px] font-semibold text-gray-800">
                {value}
            </span>
        </div>
    );
}

export default function ReviewEventDetectionCard({ data }) {
    const urgency = data?.urgency || "unknown";

    const badge = URGENCY_BADGE[urgency] || URGENCY_BADGE.unknown;
    const insightStyle = URGENCY_INSIGHT[urgency] || URGENCY_INSIGHT.unknown;

    const BadgeIcon = badge.Icon;
    const InsightIcon = insightStyle.Icon;

    const z = data?.z_scores || {};
    const reliability = data.meta

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

            {/* Header */}
            <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-gray-700" />
                    <p className="text-lg font-semibold text-gray-900">
                        Review Activity
                    </p>
                </div>

                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 ${badge.color}`}>
                    <BadgeIcon className="w-3.5 h-3.5" />
                    {badge.label}
                </span>
            </div>

            {/* Subtitle */}
            <p className="text-[11px] text-gray-400 mt-1">
                Monitors shifts in customer feedback patterns over time
            </p>

            {/* Chips */}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <Chip
                    label="Customer Experience"
                    value={interpretSignal(z.sentiment_z)}
                />
                <Chip
                    label="Customer Engagement"
                    value={interpretSignal(z.volume_z)}
                />
            </div>

            {/* Insight (urgency-colored) */}
            {data?.interpretation && (
                <div className={`mt-3 p-3 rounded-xl border flex gap-2 items-start ${insightStyle.bg}`}>
                    <InsightIcon className="w-4 h-4 mt-0.5" />

                    <p className="text-[11px] leading-snug">
                        {data.interpretation}
                    </p>
                </div>
            )}
            {/* <   ReliabilityFooter isReliable={reliability?.is_reliable} sampleSize={reliability?.sample_size} />   */}
        </div>
    );
}
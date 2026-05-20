import React from "react";
import { TrendingUp, TrendingDown, CalendarDays } from "lucide-react";

function mapShift(event, type) {
    if (!event) return null;

    const magnitude = Math.abs(event.change ?? 0);

    let impact = "Low";
    if (magnitude >= 0.6) impact = "High";
    else if (magnitude >= 0.3) impact = "Medium";

    return {
        type,
        date: event.date,
        change: Number(event.change ?? 0),
        impact,
        previous: event.previous_score,
        current: event.current_score,
        interpretation: event.interpretation || null,
    };
}

function ShiftCard({ item, type }) {
    const isPositive = type === "positive";
    const Icon = isPositive ? TrendingUp : TrendingDown;

    const containerClass = isPositive
        ? "bg-emerald-50 border border-emerald-100"
        : "bg-red-50 border border-red-100";

    const textClass = isPositive ? "text-emerald-600" : "text-red-600";

    const title = isPositive
        ? "Strongest Positive Shift"
        : "Strongest Negative Shift";

    return (
        <div className={`rounded-xl p-3 flex items-center justify-between gap-3 ${containerClass}`}>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-xs font-semibold ${textClass}`}>
                        {title}
                    </p>

                    <span className="text-[10px] text-gray-400">
                        {item.date}
                    </span>
                </div>

                <p className="text-[11px] text-gray-600 truncate mt-1">
                    {item.previous} → {item.current}
                </p>

                {item.interpretation && (
                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                        {item.interpretation}
                    </p>
                )}
            </div>

            <div className={`flex items-center gap-1 ${textClass}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">
                    {item.change.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

export default function ShiftAnalysisCard({
    data = null,
    loading = false,
    embedded = false,
}) {
    if (loading) {
        return (
            <div className="h-[90px] animate-pulse bg-gray-100 rounded-xl" />
        );
    }

    const positiveShift = mapShift(data?.peak, "positive");
    const negativeShift = mapShift(data?.drop, "negative");

    if (!positiveShift && !negativeShift) {
        return (
            <div className={embedded ? "" : "bg-white rounded-xl border p-4"}>
                <div className="flex items-center gap-2 text-gray-400">
                    <CalendarDays className="w-4 h-4" />
                    <p className="text-xs">Not enough data to detect meaningful shifts</p>
                </div>
            </div>
        );
    }

    const shellClass = embedded
        ? ""
        : "bg-white rounded-xl border border-gray-100 p-4";

    return (
        <div className={shellClass}>
            <div className="flex gap-3">
                {positiveShift && (
                    <div className="flex-1">
                        <ShiftCard item={positiveShift} type="positive" />
                    </div>
                )}

                {negativeShift && (
                    <div className="flex-1">
                        <ShiftCard item={negativeShift} type="negative" />
                    </div>
                )}
            </div>
        </div>
    );
}
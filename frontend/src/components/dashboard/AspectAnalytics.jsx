import { useEffect, useState } from "react";
import { Target, ArrowRight } from "lucide-react";
import {
    ImprovingIcon,
    DecliningIcon,
} from "../icons/TrendIcons";

const FIXED_ASPECT_ORDER = [
    "food",
    "service",
    "staff",
    "cleanliness",
    "price",
    "ambience",
    "location",
    "experience",
];

// -----------------------------
// LABEL FORMATTER
// -----------------------------
function formatLabel(label, score) {
    if (!label) return "No data";

    if (label === "positive") {
        return score >= 0.8 ? "Highly Positive" : "Positive";
    }

    if (label === "negative") {
        return score <= -0.8 ? "Highly Negative" : "Negative";
    }

    return "Neutral";
}

// -----------------------------
// TREND FORMATTER
// -----------------------------
function formatTrend(trend) {
    switch (trend) {
        case "improving":
            return {
                label: "Improving",
                Icon: ImprovingIcon,
                color: "text-green-600",
            };

        case "declining":
            return {
                label: "Declining",
                Icon: DecliningIcon,
                color: "text-red-600",
            };

        default:
            return {
                label: "Stable",
                Icon: ArrowRight,
                color: "text-sky-600",
            };
    }
}

// -----------------------------
// TOOLTIP
// -----------------------------
function AspectTooltip({ aspect, trendUI }) {
    if (!aspect) return null;

    const Icon = trendUI.Icon;

    return (
        <div className="absolute z-20 -top-20 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs whitespace-nowrap">
            <p className="text-gray-500 mb-1">
                {formatLabel(aspect.label, aspect.score)}
            </p>

            <div className={`flex items-center gap-1 font-semibold ${trendUI.color}`}>
                <Icon className="w-4 h-4" />
                <span>{trendUI.label}</span>
            </div>

            <p className="text-[#004687] mt-1 font-medium">
                Score: {aspect.score.toFixed(2)}
            </p>

            <p className="text-gray-500 mt-1">
                Change: {aspect.change > 0 ? "+" : ""}
                {aspect.change.toFixed(2)}
            </p>
        </div>
    );
}

// -----------------------------
// MAIN COMPONENT
// -----------------------------
import { Layers } from "lucide-react";

function AspectAnalytics({
    aspects = [],
    onViewAll,
    compact = true,
}) {
    const [hovered, setHovered] = useState(null);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setAnimate(true), 150);
        return () => clearTimeout(t);
    }, []);

    const aspectMap = Object.fromEntries(
        aspects.map((a) => [a.name, a])
    );

    const withData = [];
    const withoutData = [];

    for (const name of FIXED_ASPECT_ORDER) {
        if (aspectMap[name]) withData.push(name);
        else withoutData.push(name);
    }

    const sortedAspects = [...withData, ...withoutData];

    const visibleAspects = compact
        ? sortedAspects.slice(0, 4)
        : sortedAspects;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
                <Target className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">
                    Aspect Health
                </h2>
            </div>

            <p className="text-xs text-gray-400 mt-0.5 mb-4">
                How customers feel and how it changes by aspect
            </p>

            <div className="flex flex-col gap-5 flex-1">
                {visibleAspects.map((aspectName, index) => {
                    const aspect = aspectMap[aspectName];
                    const hasData = !!aspect;

                    const trendUI = formatTrend(aspect?.trend);
                    const Icon = trendUI.Icon;

                    const score = aspect?.score ?? 0;

                    const percent = hasData
                        ? Math.max(8, Math.round(((score + 1) / 2) * 100))
                        : 0;

                    const barColor = !hasData
                        ? "bg-gray-200"
                        : score >= 0.3
                        ? "bg-green-500"
                        : score <= -0.3
                        ? "bg-red-500"
                        : "bg-yellow-400";

                    return (
                        <div
                            key={aspectName}
                            className="relative"
                            onMouseEnter={() => setHovered(aspectName)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            {hovered === aspectName && hasData && (
                                <AspectTooltip
                                    aspect={aspect}
                                    trendUI={trendUI}
                                />
                            )}

    
                            {/* HEADER */}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-800 capitalize">
                                            {aspectName}
                                        </span>

                                         {hasData && (
                                            <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                                                <Icon className={`w-3.5 h-3.5 ${trendUI.color}`} />
                                                <span className={trendUI.color}>
                                                    {aspect.change > 0 ? "+" : ""}
                                                    {aspect.change.toFixed(2)}
                                                </span>
                                                <span className="text-gray-400">
                                                    {trendUI.label}
                                                </span>
                                            </div>
                                        )}
                                       
                                    </div>
                                </div>

                                {hasData ? (
                                            <span
                                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                                    aspect.label === "positive"
                                                        ? "bg-green-50 text-green-700"
                                                        : aspect.label === "negative"
                                                        ? "bg-red-50 text-red-700"
                                                        : "bg-yellow-50 text-yellow-700"
                                                }`}
                                            >
                                                {formatLabel(aspect.label, aspect.score)}
                                            </span>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">
                                        no mentions yet
                                    </span>
                                )}
                            </div>

                            {/* BAR */}
                            <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                                    style={{
                                        width: animate
                                            ? `${percent}%`
                                            : "0%",
                                        transitionDelay: `${index * 60}ms`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {compact && (
                <button
                    onClick={onViewAll}
                    className="mt-6 w-full border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    View All Aspects
                </button>
            )}
        </div>
    );
}

export default AspectAnalytics;
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { GraphIcon } from "../icons/AnalyticsIcons";
import ReviewProgressState from "./ReviewProgressState";

/* TOOLTIP */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const point = payload[0]?.payload || {};
        const reviews =
            point.review_count ?? point.review_count_per_period ?? 0;

        return (
            <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm space-y-1">
                <p className="text-gray-500 font-medium mb-1">{label}</p>

                {payload.map((p) => (
                    <p
                        key={p.dataKey}
                        style={{ color: p.color }}
                        className="font-semibold"
                    >
                        {p.name}: {p.value}
                    </p>
                ))}

                <div className="text-xs text-gray-500 mt-1">
                    <div>
                        Reviews in period:{" "}
                        <span className="font-medium text-gray-700">
                            {reviews}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

/* TRANSFORM */
function transformData(rawData = []) {
    return rawData.map((item) => {
        const reviewCount =
            item.review_count ??
            item.review_count_per_period ??
            0;

        const label =
            item.period?.toString()?.slice(5) ??
            String(item.period);

        return {
            period: label,
            review_count: reviewCount,
            review_count_per_period: reviewCount,
        };
    });
}

const GRANULARITIES = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
];

function getSeriesForGranularity(reviewVolumeOverTime, granularity) {
    const series = reviewVolumeOverTime?.[granularity];

    if (!series) {
        return { data: [], meta: {} };
    }

    if (Array.isArray(series)) {
        return { data: series, meta: {} };
    }

    return {
        data: series.data ?? [],
        meta: series.meta ?? {},
    };
}

/* MAIN COMPONENT */
function ReviewVolumeChart({ data = {} }) {
    const [granularity, setGranularity] = useState("daily");

    const { data: selectedData, meta } = useMemo(
        () => getSeriesForGranularity(data, granularity),
        [data, granularity],
    );

    const chartData = transformData(selectedData);

    const isEmpty = chartData.length === 0;
    const isInsufficient =
        !meta?.is_reliable || chartData.length < 2;

    const sampleSize = meta?.sample_size ?? 0;
    const minRequired = meta?.min_required ?? 5;

    const step = Math.max(Math.ceil(chartData.length / 10), 1);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Review Volume Trend
                    </h2>
                </div>

                <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium">
                    {GRANULARITIES.map((option) => {
                        const isActive = granularity === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setGranularity(option.value)}
                                className={`rounded-full px-3 py-1.5 transition-colors ${
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-gray-400 mb-5">
                Track customer review activity over time by granularity
            </p>

            {/* BODY */}
            {isEmpty ? (
                <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                        <GraphIcon className="w-6 h-6" />
                    </div>

                    <p className="font-medium text-gray-700">
                        No review activity yet
                    </p>

                    <p className="text-sm text-gray-400">
                        Reviews will populate this chart over time.
                    </p>
                </div>
            ) : isInsufficient ? (
                <ReviewProgressState
                    sampleSize={sampleSize}
                    minRequired={minRequired}
                    title="Almost there..."
                    description="Need more reviews to generate reliable activity insights."
                />
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient
                                id="reviewVolumeGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#004687"
                                    stopOpacity={0.16}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#004687"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="period"
                            tick={{
                                fontSize: 11,
                                fill: "#9ca3af",
                            }}
                            interval={step - 1}
                        />

                        <YAxis
                            allowDecimals={false}
                            tick={{
                                fontSize: 11,
                                fill: "#9ca3af",
                            }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <Legend />

                        <Area
                            type="monotone"
                            dataKey="review_count"
                            name="Review Count"
                            stroke="#004687"
                            strokeWidth={2.5}
                            fill="url(#reviewVolumeGradient)"
                            dot={false}
                            activeDot={{ r: 5 }}
                            isAnimationActive={true}
                            animationDuration={400}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

export default ReviewVolumeChart;
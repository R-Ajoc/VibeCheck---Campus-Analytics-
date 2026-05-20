import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    CartesianGrid,
} from "recharts";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { GraphIcon } from "../icons/AnalyticsIcons";
import ReviewProgressState from "./ReviewProgressState";

const RANGES = ["7D", "30D", "90D"];

/* Tooltip for vibe score chart */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        const pointKind = payload[0]?.payload?.point_kind;
        const pointLabel =
            pointKind === "peak"
                ? "Peak point"
                : pointKind === "drop"
                ? "Drop point"
                : null;

        return (
            <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
                <p className="text-gray-500">{label}</p>
                {pointLabel && (
                    <p className="text-xs font-medium mt-0.5 text-[#004687]">
                        {pointLabel}
                    </p>
                )}
                <p className="font-semibold text-[#004687]">
                    Vibe Score: {Number(value).toFixed(2)} / 5
                </p>
            </div>
        );
    }
    return null;
};

// Empty and insufficient data state containers
function EmptyState({ type, minRequired, sampleSize }) {
    if (type === "no_data") {
        return (
            <div className="h-[320px] flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <GraphIcon className="w-6 h-6" />
                </div>
                <div>
                    <p className="font-medium text-gray-700">No vibe data yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                        once your first reviews come in, your vibe trend will appear here.
                    </p>
                </div>
            </div>
        );
    }

    if (type === "insufficient") {
        // delegating the progress UI to ReviewProgressState for consistency
        return (
            <ReviewProgressState
                meta={null}
                sampleSize={sampleSize}
                minRequired={minRequired}
                title={"building your trend..."}
                description={"across different days to see your vibe trend chart."}
            />
        );
    }

    return null;
}

// Main component
function VibeChart({ data = {}, vibeOverTime = {}, peakAndDrop = {}, embedded = false, headerRight = null }) {
    const [range, setRange] = useState("7D");

    const rawData = Array.isArray(data?.[range]) ? data[range] : [];

    const highlightMap = new Map();

    const peak = peakAndDrop?.peak;
    const drop = peakAndDrop?.drop;

    if (peak?.date != null) {
        highlightMap.set(String(peak.date), {
            kind: "peak",
            label: peak.title || "Peak point",
            score: peak.current_score ?? peak.value,
        });
    }

    if (drop?.date != null) {
        highlightMap.set(String(drop.date), {
            kind: "drop",
            label: drop.title || "Drop point",
            score: drop.current_score ?? drop.value,
        });
    }

    const chartData = rawData
        .filter((item) => item?.avg_score != null && item?.period)
        .map((item) => ({
            period: item.period,
            vibe_score: Number(item.avg_score),
            ...(highlightMap.has(String(item.period))
                ? {
                      point_kind: highlightMap.get(String(item.period)).kind,
                      point_label: highlightMap.get(String(item.period)).label,
                  }
                : {}),
        }));

    const sampleSize = vibeOverTime?.meta?.sample_size ?? rawData.length;
    const minRequired = vibeOverTime?.meta?.min_required ?? 5;

    const isEmpty = chartData.length === 0;

    const isInsufficient =
        vibeOverTime?.meta?.is_reliable === false ||
        sampleSize < minRequired;

    const content = (
        <>
            {/* Header with range selector */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">
                           Vibe Performance Trend
                        </h2>
                    </div>

                    <p className="text-xs text-gray-400 mt-0.5">
                       Monitor changes in customer sentiment and overall experience over time
                    </p>
                </div>

                {/* Range Selector */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                                range === r
                                    ? "bg-[#004687] text-white"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Optional right-aligned header slot (e.g. Peak/Drop card) */}
            {headerRight && (
                <div className="mb-4">
                    {headerRight}
                </div>
            )}

            {/* Chart Content */}
            {isEmpty ? (
                <EmptyState type="no_data" />
            ) : isInsufficient ? (
                <EmptyState
                    type="insufficient"
                    sampleSize={sampleSize}
                    minRequired={minRequired}
                />
            ) : (
                <div style={{ width: "100%", height: 420 }}>
                    <ResponsiveContainer>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="vibeGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#004687"
                                        stopOpacity={0.15}
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
                                tick={{ fontSize: 12, fill: "#9ca3af" }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                domain={[1, 5]}
                                tick={{ fontSize: 12, fill: "#9ca3af" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => Number(v).toFixed(1)}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            <Area
                                type="monotone"
                                dataKey="vibe_score"
                                stroke="#004687"
                                strokeWidth={2.5}
                                fill="url(#vibeGradient)"
                                dot={false}
                                isAnimationActive={true}
                                animationDuration={400}
                            />

                            {/* Render reference dots only for peak/drop to avoid per-point custom dot rendering */}
                            {peak && (
                                <ReferenceDot
                                    x={peak.date}
                                    y={peak.current_score ?? peak.value}
                                    r={5}
                                    fill="#16a34a"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                    isFront
                                />
                            )}

                            {drop && (
                                <ReferenceDot
                                    x={drop.date}
                                    y={drop.current_score ?? drop.value}
                                    r={5}
                                    fill="#dc2626"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                    isFront
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[530px]">
            {content}
        </div>
    );
}

export default VibeChart;
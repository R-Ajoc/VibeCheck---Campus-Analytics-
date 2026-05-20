import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { GraphIcon } from "../icons/AnalyticsIcons";

const COLORS = {
    positive: "#22c55e",
    neutral: "#94a3b8",
    negative: "#ef4444",
};

const LABELS = {
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const { name, value } = payload[0];

        return (
            <div className="bg-white border z-100 border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm">
                <p className="font-semibold" style={{ color: COLORS[name] }}>
                    {LABELS[name]}: {value}%
                </p>
            </div>
        );
    }
    return null;
};

function SentimentPieChart({ distribution = {} }) {
    // Accept both shapes: flat map { positive: {count, percentage}, ... }
    // or wrapper { distribution: { ... }, total_reviews, meta }
    const raw = distribution?.distribution ?? distribution ?? {};

    const entries = Object.entries(raw).filter(([, v]) => Number(v?.count) > 0);

    const chartData = entries.map(([key, val]) => ({
        name: key,
        value: Number(val?.percentage ?? 0),
        count: Number(val?.count ?? 0),
    }));

    const total = entries.reduce((sum, [, v]) => sum + Number(v?.count ?? 0), 0);

    if (total === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                    <PieChartIcon className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Sentiment Distribution
                    </h2>
                </div>

                <div className="h-[320px] flex flex-col items-center justify-center gap-3 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                        <GraphIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-700">No distribution data yet</p>
                         <p className="text-xs text-gray-400">
                            Not enough reviews to show sentiment distribution
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    //  FIXED: proper dominant detection
    const sorted = [...chartData].sort((a, b) => b.value - a.value);

    const top = sorted[0];
    const second = sorted[1];

    const isTie = second && Math.abs(top.value - second.value) < 1; 
    const isMixed = isTie || top.value < 40;

    const dominant = isMixed
        ? { name: "mixed", value: top.value }
        : top;

    const insightText =
        dominant.name === "positive"
            ? "Customers are generally satisfied with this business experience."
            : dominant.name === "negative"
            ? "Negative sentiment is more prominent in recent reviews."
            : dominant.name === "neutral"
            ? "Customer sentiment is mostly neutral."
            : "Customer sentiment is mixed with no clear dominant trend.";

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

            <div className="flex items-center gap-2 mb-1">
                <PieChartIcon className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">
                    Sentiment Distribution
                </h2>
            </div>

            <p className="text-xs text-gray-400 mb-5">
                Based on {total} review{total !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-6">

                {/* DONUT */}
                <div className="relative w-[160px] h-[160px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={72}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {chartData.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={COLORS[entry.name]}
                                    />
                                ))}
                            </Pie>

                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* CENTER LABEL (FIXED) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-900">
                            {dominant.value.toFixed(0)}%
                        </span>

                        <span
                            className="text-xs font-medium capitalize"
                            style={{
                                color:
                                    COLORS[dominant.name] || "#6b7280",
                            }}
                        >
                            {LABELS[dominant.name] || "Mixed"}
                        </span>
                    </div>
                </div>

                {/* LEGEND */}
                <div className="flex flex-col gap-4 flex-1 min-w-0">

                    {chartData.map((entry) => (
                        <div key={entry.name} className="flex flex-col gap-1">

                            {/* LABEL ON TOP */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 w-[90px]">
                                    {LABELS[entry.name]}
                                </span>

                                <span className="text-sm font-semibold text-gray-800 w-10 text-right">
                                    {entry.value.toFixed(1)}%
                                </span>
                            </div>

                            {/* BAR */}
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${entry.value}%`,
                                        backgroundColor: COLORS[entry.name],
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* INSIGHT */}
            <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-gray-700 mb-1">
                    Insight
                </p>
                <p>{insightText}</p>
            </div>
        </div>
    );
}

export default SentimentPieChart;
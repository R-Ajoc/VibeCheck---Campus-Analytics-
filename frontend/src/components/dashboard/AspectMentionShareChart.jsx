import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

// Color palette for aspects
const ASPECT_COLORS = {
    food: "#3b82f6",
    service: "#6366f1",
    staff: "#8b5cf6",
    cleanliness: "#d946ef",
    price: "#ec4899",
    ambience: "#f43f5e",
    location: "#f97316",
    experience: "#eab308",
};

function AspectMentionShareChart({ data = {}, title = "Aspect Mention Share", subtitle = "Proportion of customer mentions across aspects", topAspectName = null, topAspect = null }) {
    const aspects = data?.aspects || [];
    const total = aspects.reduce((sum, a) => sum + (a.count || 0), 0);

    if (!aspects.length || total === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-0.5">
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 mb-6">
                    {subtitle}
                </p>
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                    <p>No aspect mentions yet</p>
                </div>
            </div>
        );
    }

    // Filter to aspects with counts > 0
    const chartData = aspects
        .filter(a => (a.count || 0) > 0)
        .map(a => ({
            name: a.term.charAt(0).toUpperCase() + a.term.slice(1),
            value: a.count || 0,
            term: a.term,
        }));

    if (!chartData.length) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-0.5">
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 mb-6">
                    {subtitle}
                </p>
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                    <p>No aspect mentions yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-6">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                    {subtitle}
                </p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={ASPECT_COLORS[entry.term] || "#94a3b8"}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => [value, "Mentions"]}
                        contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.5rem",
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* INSIGHT SECTION */}
            <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-2">Insight</p>
                <p className="text-xs text-gray-500 mb-4">
                    {topAspectName
                        ? `Customers mention ${topAspectName} most often (${topAspect.count} mentions).`
                        : `No clear aspect insight available yet.`}
                </p>
                <Link
                    to="/business/analytics"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#004687] text-white rounded-lg hover:opacity-95 text-xs font-medium"
                >
                    Explore aspect analysis
                </Link>
            </div>
        </div>
    );
}

export default AspectMentionShareChart;

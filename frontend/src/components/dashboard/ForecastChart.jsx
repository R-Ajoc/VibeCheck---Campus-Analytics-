import React, { useMemo } from "react";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from "recharts";

function addMonths(period, monthsToAdd) {
	if (typeof period !== "string" || !period.includes("-")) {
		return String(period);
	}

	const [year, month] = period.split("-").map((v) => parseInt(v, 10));
	if (Number.isNaN(year) || Number.isNaN(month)) return period;

	const date = new Date(Date.UTC(year, month - 1, 1));
	date.setUTCMonth(date.getUTCMonth() + monthsToAdd);

	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildForecastDataset(payload = {}) {
	const history = Array.isArray(payload.history) ? payload.history : [];
	const forecast = Array.isArray(payload.forecast) ? payload.forecast : [];

	const historyRows = history.map((item) => ({
		period: item.period,
		actual: Number(item.avg_score ?? 0),
		forecast: null,
		type: "history",
	}));

	const lastPeriod = historyRows.at(-1)?.period;

	const forecastRows = forecast.map((item, i) => ({
		period:
			typeof item.period === "string" && item.period.includes("-")
				? item.period
				: lastPeriod
					? addMonths(lastPeriod, i + 1)
					: String(item.period),
		actual: null,
		forecast: Number(item.predicted ?? 0),
		type: "forecast",
	}));

	return [...historyRows, ...forecastRows];
}

function ForecastTooltip({ active, payload }) {
	if (!active || !payload?.length) return null;

	const point = payload[0].payload;

	return (
		<div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
			<div className="text-xs font-semibold text-gray-700">{point.period}</div>
			<div className="text-[11px] text-gray-500">
				{point.type === "history" ? "Historical" : "Forecast"}
			</div>
			<div className="mt-1 text-sm font-semibold text-[#004687]">
				{Number(point.actual ?? point.forecast ?? 0).toFixed(2)}
			</div>
		</div>
	);
}

const VIBE_LABEL_META = {
	very_positive: { label: "Very Positive", badge: "bg-green-50 text-green-700 border-green-100" },
	positive: { label: "Positive", badge: "bg-green-50 text-green-700 border-green-100" },
	slightly_positive: { label: "Slightly Positive", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
	mixed: { label: "Mixed", badge: "bg-gray-50 text-gray-700 border-gray-100" },
	slightly_negative: { label: "Slightly Negative", badge: "bg-amber-50 text-amber-700 border-amber-100" },
	negative: { label: "Negative", badge: "bg-red-50 text-red-700 border-red-100" },
	very_negative: { label: "Very Negative", badge: "bg-red-50 text-red-700 border-red-100" },
};

export default function SentimentForecastChart({ data = {} }) {
	const meta = data?.meta ?? {};

	const history = Array.isArray(data?.history) ? data.history : [];
	const forecast = Array.isArray(data?.forecast) ? data.forecast : [];

	const chartData = useMemo(() => buildForecastDataset(data), [data]);

	// ✅ MAIN FIX: correct gating logic
	const isInsufficient =
		data?.status === "insufficient_data" ||
		meta?.is_reliable === false ||
		history.length < (meta?.min_required ?? 6);

	const isEmpty = history.length === 0 && forecast.length === 0;

	const predictedVibe = data?.predicted_vibe || "mixed";
	const forecastScore = Number(data?.forecast_score);
	const vibeMeta = VIBE_LABEL_META[predictedVibe] || VIBE_LABEL_META.mixed;

	return (
		<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

			{/* HEADER */}
			<div className="mb-4 flex flex-wrap justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold">Sentiment Forecast</h3>
					<p className="text-xs text-gray-500">
						Historical vs projected trend
					</p>
				</div>

				<div className="flex gap-2">
					<span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${vibeMeta.badge}`}>
						{vibeMeta.label}
					</span>

					{meta?.is_reliable === false && (
						<span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-amber-100 bg-amber-50 text-amber-700">
							Low confidence
						</span>
					)}

					{Number.isFinite(forecastScore) && (
						<span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-sky-100 bg-sky-50 text-sky-700">
							Score: {forecastScore.toFixed(2)}
						</span>
					)}
				</div>
			</div>

			{/* BODY */}
			<div className="h-72">

				{/* EMPTY STATE */}
				{isEmpty ? (
					<div className="h-full flex items-center justify-center text-center">
						<p className="text-sm text-gray-600">
							No forecast data yet
						</p>
					</div>

				) : isInsufficient ? (

					/* INSUFFICIENT DATA STATE */
					<div className="h-full flex items-center justify-center text-center">
						<p className="text-sm text-gray-600">
							Need at least {meta?.min_required ?? 6} months of data to generate forecast.
						</p>
					</div>

				) : (

					/* CHART */
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={chartData}>
							<CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" />
							<XAxis dataKey="period" tick={{ fontSize: 12 }} />
							<YAxis domain={[-1, 1]} tick={{ fontSize: 12 }} />
							<Tooltip content={<ForecastTooltip />} />

							<Line
								type="monotone"
								dataKey="actual"
								stroke="#0f766e"
								strokeWidth={2.5}
								dot={{ r: 3 }}
							/>

							<Line
								type="monotone"
								dataKey="forecast"
								stroke="#0f766e"
								strokeOpacity={0.55}
								strokeDasharray="6 6"
								strokeWidth={2.5}
								dot={{ r: 3 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
}
import HealthGauge from "../dashboard/HealthGauge";

function BreakdownBar({ label, value }) {
	const pct = value == null ? 0 : Number(value) <= 1 ? Number(value) * 100 : Number(value);
	const display = value == null ? "--" : `${pct.toFixed(0)}%`;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-gray-500 capitalize">{label}</span>
				<span className="text-xs font-semibold text-gray-800 tabular-nums">{display}</span>
			</div>
			<div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
				<div
					className="h-full rounded-full transition-all duration-700"
					style={{
						width: `${Math.min(pct, 100)}%`,
						background: pct >= 70 ? "#004687" : pct >= 45 ? "#3b82f6" : "#93c5fd",
					}}
				/>
			</div>
		</div>
	);
}

function InsightPill({ level }) {
	const map = {
		good:     "bg-[#004687]/10 text-[#004687]",
		reliable: "bg-blue-50 text-blue-700",
		moderate: "bg-amber-50 text-amber-700",
		weak:     "bg-red-50 text-red-700",
	};
	return (
		<span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[level] || map.moderate}`}>
			{level}
		</span>
	);
}

export default function HealthDiagnostic({ data = {} }) {
	const score      = data?.score;
	const label      = data?.label || "Unknown";
	const breakdown  = data?.breakdown || {};
	const insights   = data?.insights || {};
	const raw        = data?.raw || {};

	const scorePct = score == null
		? "--"
		: `${(Number(score) <= 1 ? Number(score) * 100 : Number(score)).toFixed(1)}%`;

	const insightRows = [
		insights?.alignment,
		insights?.confidence,
		insights?.health,
	].filter(Boolean);

	return (
		<section className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm p-5 xl:p-6">
			{/* Page header */}
			<div className="mb-5">
			
				<h2 className="text-xl font-semibold text-gray-900">Business Health Overview</h2>
				<p className="text-xs text-gray-400 mt-1">
					Overall business condition derived from review signals and behavioral trends
				</p>
			</div>

			<div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
				{/* Left — gauge + score summary */}
				<div className="flex flex-col items-center gap-4 rounded-2xl bg-[#004687]/[0.03] border border-[#004687]/10 p-5">
					<HealthGauge data={data} />
					<div className="text-center">
						<p className="text-3xl font-bold text-gray-900 tabular-nums">{scorePct}</p>
						<span className="mt-1.5 inline-block rounded-full bg-[#004687] px-3 py-0.5 text-xs font-semibold text-white">
							{label}
						</span>
					</div>

					{/* Raw context chips */}
					<div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-[#004687]/10">
						{[
							{ key: "Reviews",     val: raw.review_count ?? "--" },
							{ key: "Quality",     val: raw.data_quality ? String(raw.data_quality) : "--" },
							{ key: "Cold start",  val: raw.is_cold_start != null ? (raw.is_cold_start ? "Yes" : "No") : "--" },
						].map(({ key, val }) => (
							<div key={key} className="flex flex-col items-center gap-0.5">
								<span className="text-[10px] uppercase tracking-wide text-gray-400">{key}</span>
								<span className="text-sm font-semibold text-gray-800 capitalize">{val}</span>
							</div>
						))}
					</div>
				</div>

				{/* Right — breakdown + insights */}
				<div className="flex flex-col gap-5">
					{/* Score breakdown */}
					<div className="rounded-2xl border border-gray-100 bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Score Drivers</p>
						<div className="grid gap-3.5">
							{[
								{ key: "vibe", label: "Vibe" },
								{ key: "trend", label: "Trend" },
								{ key: "alignment", label: "Experience Consistency" },
								{ key: "confidence", label: "Confidence" },
							].map(({ key, label }) => (
								<BreakdownBar key={key} label={label} value={breakdown[key]} />
							))}
						</div>
					</div>

					{/* Insight interpretation */}
					{insightRows.length > 0 && (
						<div className="rounded-2xl border border-gray-100 bg-white p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Insights</p>
							<div className="flex flex-col divide-y divide-gray-50">
								{insightRows.map((ins, i) => (
									<div key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-gray-800">{ins.label}</p>
											{ins.meaning && (
												<p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ins.meaning}</p>
											)}
										</div>
										{ins.level && <InsightPill level={ins.level} />}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
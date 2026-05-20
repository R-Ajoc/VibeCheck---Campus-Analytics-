import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

/* -----------------------------
   HELPERS
------------------------------ */
function clamp01(v) {
    if (v == null) return null;
    return Math.max(0, Math.min(1, v));
}

function getColor(score) {
    if (score >= 0.75) return "#22c55e";
    if (score >= 0.55) return "#84cc16";
    if (score >= 0.35) return "#facc15";
    if (score >= 0.15) return "#f97316";
    return "#ef4444";
}

function getLabel(score) {
    if (score >= 0.75) return "Excellent";
    if (score >= 0.55) return "Healthy";
    if (score >= 0.35) return "Fair";
    if (score >= 0.15) return "Weak";
    return "Critical";
}

function formatValue(value) {
    if (value == null) return "--";
    if (typeof value === "number") return value.toFixed(1);
    return String(value);
}

/* -----------------------------
   TOOLTIP
------------------------------ */
function HealthInsightsTooltip({ data }) {
    const insights = data?.insights || {};
    const status = data?.status || "computed";

    return (
        <div className="absolute z-20 top-10 left-1 -translate-x-1/2 bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs w-72">

            <p className="font-semibold text-gray-700 mb-3">
                Business Health Breakdown
            </p>

            <div className="space-y-3 text-gray-600">

                {/* VIBE */}
                <div>
                    <div className="flex justify-between">
                        <p className="font-medium">Vibe Score</p>
                        <p className="font-semibold text-[#004687]">
                            {status === "no_data"
                                ? "No data"
                                : formatValue(data?.raw?.vibe_score)}
                        </p>
                    </div>
                </div>

                {/* TREND */}
                <div>
                    <div className="flex justify-between">
                        <p className="font-medium">Trend</p>
                        <p className="font-semibold text-[#004687]">
                            {status === "no_data"
                                ? "No data"
                                : data?.raw?.trend_label}
                        </p>
                    </div>
                </div>

                {/* ALIGNMENT */}
                <div>
                    <div className="flex justify-between">
                        <p className="font-medium">Experience Consistency</p>
                        <p className="font-semibold text-[#004687]">
                            {insights.alignment?.label ?? "--"}
                        </p>
                    </div>
                    <p className="text-gray-400 text-[10px]">
                        {insights.alignment?.meaning}
                    </p>
                </div>

                {/* CONFIDENCE */}
                <div>
                    <div className="flex justify-between">
                        <p className="font-medium">Confidence</p>
                        <p className="font-semibold text-[#004687]">
                            {insights.confidence?.label ?? "--"}
                        </p>
                    </div>
                    <p className="text-gray-400 text-[10px]">
                        {insights.confidence?.meaning}
                    </p>
                </div>

            </div>
        </div>
    );
}

/* -----------------------------
   GAUGE SVG
------------------------------ */
const CX = 110;
const CY = 80;
const R_OUTER = 70;
const R_INNER = 50;

const GAUGE_START = 225;
const GAUGE_END = 315;
const GAUGE_SWEEP = 270;

const ZONES = [
    { color: "#ef4444" },
    { color: "#f97316" },
    { color: "#facc15" },
    { color: "#84cc16" },
    { color: "#22c55e" },
];

function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
    const s1 = polarToCartesian(cx, cy, rOuter, startAngle);
    const e1 = polarToCartesian(cx, cy, rOuter, endAngle);
    const s2 = polarToCartesian(cx, cy, rInner, endAngle);
    const e2 = polarToCartesian(cx, cy, rInner, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;

    return [
        `M ${s1.x} ${s1.y}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${e1.x} ${e1.y}`,
        `L ${s2.x} ${s2.y}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${e2.x} ${e2.y}`,
        "Z",
    ].join(" ");
}

/* -----------------------------
   GAUGE
------------------------------ */
function GaugeSVG({ score, status }) {
    const isDisabled = status === "no_data" || score == null;

    const [anim, setAnim] = useState(0);

    useEffect(() => {
        if (isDisabled) return;

        let frame;
        const duration = 1200;
        const start = performance.now();

        const animate = (time) => {
            const progress = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setAnim(eased * score);

            if (progress < 1) {
                frame = requestAnimationFrame(animate);
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [score, isDisabled]);

    const needleAngle = GAUGE_START + anim * GAUGE_SWEEP;
    const needleRad = ((needleAngle - 90) * Math.PI) / 180;
    const needleLen = R_INNER - 6;

    const nx = CX + needleLen * Math.cos(needleRad);
    const ny = CY + needleLen * Math.sin(needleRad);

    return (
        <svg viewBox="0 0 220 150" width="100%" style={{ display: "block" }}>

            {/* BACKGROUND */}
            <path
                d={arcPath(CX, CY, R_OUTER, R_INNER, GAUGE_START, GAUGE_END)}
                fill="#f1f5f9"
            />

            {/* ZONES */}
            {ZONES.map((z, i) => {
                const seg = GAUGE_SWEEP / ZONES.length;
                const start = GAUGE_START + i * seg;
                const end = GAUGE_START + (i + 1) * seg;

                return (
                    <path
                        key={i}
                        d={arcPath(CX, CY, R_OUTER, R_INNER, start, end)}
                        fill={isDisabled ? "#e5e7eb" : z.color}
                        opacity={isDisabled ? 1 : 0.85}
                    />
                );
            })}

            {/* NEEDLE */}
            {!isDisabled && (
                <>
                    <line
                        x1={CX}
                        y1={CY}
                        x2={nx}
                        y2={ny}
                        stroke="#0f172a"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <circle cx={CX} cy={CY} r="6" fill="#0f172a" />
                    <circle cx={CX} cy={CY} r="3" fill="white" />
                </>
            )}

            {/* SCORE */}
            {!isDisabled && (
                <text
                    x={CX}
                    y={CY + 18}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="700"
                    fill="#0f172a"
                >
                    {(anim * 100).toFixed(0)}
                </text>
            )}

            {/* LABEL */}
            <foreignObject x="60" y="112" width="100" height="30">
                <div className="flex justify-center">
                    {isDisabled ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-400 text-white">
                            No data
                        </span>
                    ) : (
                        <span
                            className="px-2 py-0.5 text-[10px] font-semibold rounded-full text-white"
                            style={{ backgroundColor: getColor(score) }}
                        >
                            {getLabel(score)}
                        </span>
                    )}
                </div>
            </foreignObject>
        </svg>
    );
}

/* -----------------------------
   MAIN COMPONENT
------------------------------ */
function HealthGauge({ data, showIcon = true }) {
    const status = data?.status || "computed";
    const score = status === "no_data" ? null : clamp01(data?.score);
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div
            className="relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >

            {showTooltip && <HealthInsightsTooltip data={data} />}

            {/* HEADER */}
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    {showIcon && <Heart className="w-5 h-5 text-gray-700 fill-gray-700" />}
                    <h3 className="text-sm font-semibold text-gray-900">
                        Business Health
                    </h3>
                </div>
                <p className="text-xs text-gray-400">
                    Composite performance score
                </p>
            </div>

            {/* GAUGE */}
            <div>
                <GaugeSVG score={score} status={status} />

                <div className="text-center mt-1">
                    {status === "no_data" ? (
                        <p className="text-[11px] text-gray-400">
                            Waiting for reviews to generate insights
                        </p>
                    ) : (
                        <p className="text-[12px] text-gray-400">
                            {data?.insights?.health?.meaning}
                        </p>
                    )}
                </div>
            </div>
           
        </div>
    );
}

export default HealthGauge;
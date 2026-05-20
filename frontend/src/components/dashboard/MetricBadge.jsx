import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

function MetricBadge({
    direction = "stable",
    value
}) {
    /* =========================
       TREND MODE (vibe / sentiment)
    ========================= */
    const isImproving = direction === "improving";
    const isDeclining = direction === "declining";

    const Icon =
        isImproving ? TrendingUp :
        isDeclining ? TrendingDown :
        ArrowRight;

    const color =
        isImproving ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
        isDeclining ? "text-red-600 bg-red-50 border-red-100" :
        "text-sky-600 bg-sky-50 border-sky-100";

    const label =
        isImproving ? "Improving" :
        isDeclining ? "Declining" :
        "Stable";

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="font-light text-[10px]">{label}</span>

            {value != null && (
                <>
                    <span className="opacity-40">|</span>
                    <span>{value}</span>
                </>
            )}
        </div>
    );
}

export default MetricBadge;
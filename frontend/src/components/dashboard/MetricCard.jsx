import MetricBadge from "./MetricBadge";

function MetricCard({
    label,
    value,
    subtitle,
    trend,
    showTrend = true
}) {

    return (
        <div className="border border-gray-100 shadow-sm  bg-white rounded-2xl p-5 flex flex-col gap-3">

            {/* header */}
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    {label}
                </p>

                {showTrend && (
                    <MetricBadge
                        direction={trend?.direction}
                        value={trend?.value}
                    />
                )}
            </div>

            {/* value */}
            <div className="h-8 flex items-center">
                <p className="text-3xl font-bold text-gray-900 leading-none">
                    {value}
                </p>
            </div>

            {/* subtitle */}
            <div className="min-h-[20px]">
                <p className="text-xs text-gray-400">
                    {subtitle}
                </p>
            </div>
        </div>
    );
}

export default MetricCard;
import { useMemo } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const CustomTooltip = ({ active, payload, isUp }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 shadow-sm text-xs font-medium text-gray-700">
      {payload[0].value.toFixed(1)}
    </div>
  );
};

export default function VibeScoreKPI({ data }) {
  const payload = data ?? DEFAULT_DATA;

  // Map backend trend values to UI states
  const isUp = payload.trend === "improving" || payload.trend === "up";
  const isDown = payload.trend === "declining" || payload.trend === "down";
  const isStable = payload.trend === "stable";

  const strokeColor = "#004687";
  const fillId = "fillVibe";

  const chartData = useMemo(
    () => (payload.timeseries ?? []).map((d) => ({ period: d.period, value: d.value })),
    [payload.timeseries]
  );

  if (payload.status === "insufficient_data") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Vibe Score</p>
        <p className="mt-2 text-gray-400 text-sm">Not enough data yet.</p>
      </div>
    );
  }

  const changeSign = payload.change >= 0 ? "+" : "";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
          Vibe Score
        </span>
        <RefreshCw className="w-3.5 h-3.5 text-gray-300" />
      </div>

      {/* Value + Chart row */}
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-semibold text-gray-900 leading-none tabular-nums">
            {payload.current_score != null ? payload.current_score.toFixed(1) : "—"}
          </span>

          {/* Change badge */}
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${
              isUp ? "text-emerald-600" : isDown ? "text-orange-500" : "text-[#004687]"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : isDown ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>
              {payload.change_percent !== undefined && payload.change_percent !== null ? (
                <>
                  {changeSign}
                  {Math.abs(payload.change_percent).toFixed(1)}% from last period
                </>
              ) : (
                "No previous data"
              )}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={`text-xs font-semibold tabular-nums ${
              isUp ? "text-emerald-500" : isDown ? "text-orange-400" : "text-[#004687]"
            }`}
          >
            {changeSign}
            {(payload.change ?? 0).toFixed(1)}
          </span>
          <div className="w-28 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id="fillVibe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#004687" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#004687" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={<CustomTooltip isUp={isUp} />}
                  cursor={false}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={1.75}
                  fill={`url(#${fillId})`}
                  dot={false}
                  activeDot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAnalytics, getSentimentTimeline, getUnprocessed } from "../../services/api";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, XAxis as XAxis2, YAxis as YAxis2,
} from "recharts";

const ASPECT_LABELS = {
  academic_stress: "Academic Stress",
  faculty_behavior: "Faculty Behavior",
  administration: "Administration",
  facilities: "Campus Facilities",
  student_politics: "Student Politics",
  mental_health: "Student Mental Health",
  cost: "Tuition & Costs",
  services_transit: "Transit & Services",
  faculty: "Faculty & Professors",
  workload: "Workload Management",
  scheduling: "Exam & Class Scheduling",
  enrollment: "Pre-Enrollment & Admin",
  experience: "Student Experience",
  ambience: "Campus Atmosphere",
  love_life: "Love Life",
};

const TREND_ICONS = {
  improving: { symbol: "↑", color: "text-emerald-600" },
  declining: { symbol: "↓", color: "text-red-500" },
  stable: { symbol: "→", color: "text-slate-400" },
  insufficient_data: { symbol: "–", color: "text-slate-300" },
};

const SEVERITY_COLORS = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-slate-50 border-slate-200 text-slate-600",
};

function ScoreBar({ score }) {
  const pct = Math.abs(score) * 100;
  const color =
    score > 0.2 ? "bg-emerald-500" : score < -0.2 ? "bg-red-400" : "bg-slate-300";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SentimentBadge({ score }) {
  if (score > 0.2) return <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Positive</span>;
  if (score < -0.2) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Negative</span>;
  return null;
}

function AspectBar({ term, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const friendlyLabel = String(term)
    .replace(/_/g, " ")
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 text-xs text-slate-600 truncate shrink-0">
        {ASPECT_LABELS[String(term).toLowerCase()] || friendlyLabel}
      </span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#004687] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-xs text-slate-400 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [groupBy, setGroupBy] = useState("month");
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getAnalytics();
        setAnalytics(data);
        setError(null);
      } catch {
        setError("Unable to load analytics. Please refresh or log in again.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetchTimeline = async () => {
      setTimelineLoading(true);
      try {
        const data = await getSentimentTimeline(groupBy);
        setTimeline(data.timeline || []);
      } catch {
        setTimeline([]);
      } finally {
        setTimelineLoading(false);
      }
    };
    fetchTimeline();
  }, [groupBy]);

  const aspectFrequency = analytics?.aspect_frequency?.aspects || [];
  const maxCount = Math.max(...aspectFrequency.map((a) => a.count), 1);

  const aspects = analytics?.aspects || [];

  const seen = new Set();
  const negativeAspects = [...aspects]
    .filter((a) => a.score < -0.2)
    .filter((a) => {
      const normalized = a.name.toLowerCase().replace(/[\s_&]/g, "");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .sort((a, b) => a.score - b.score);

  const seenPos = new Set();
  const positiveAspects = [...aspects]
    .filter((a) => a.score > 0.2)
    .filter((a) => {
      const normalized = a.name.toLowerCase().replace(/[\s_&]/g, "");
      if (seenPos.has(normalized)) return false;
      seenPos.add(normalized);
      return true;
    })
    .sort((a, b) => b.score - a.score);

  const negativeSignals = analytics?.negative_signals?.signals || [];
  const positiveSignals = analytics?.positive_drivers?.signals || [];
  const negativePattern = analytics?.negative_signals?.pattern;
  const positivePattern = analytics?.positive_drivers?.pattern;

  const sentimentPieData = analytics?.sentiment_distribution
    ? [
        { name: "Positive", value: analytics.sentiment_distribution.positive || 0, fill: "#10b981" },
        { name: "Negative", value: analytics.sentiment_distribution.negative || 0, fill: "#f87171" },
      ].filter((item) => item.value > 0)
    : [];

  const metrics = [
    {
      label: "Processed confessions",
      value: analytics?.confession_count ?? "—",
      sub: null,
    },
    {
      label: "Sentiment stability",
      value: analytics?.sentiment_volatility?.stability
        ? analytics.sentiment_volatility.stability.replace(/_/g, " ")
        : "—",
      sub: `Score: ${analytics?.sentiment_volatility?.volatility?.toFixed(2) ?? "—"}`,
    },
    {
      label: "Campus Academic Index",
      value: analytics?.academic_health_index?.label ?? "—",
      sub: `Score: ${analytics?.academic_health_index?.score?.toFixed(2) ?? "—"}`,
    },
  ];

  const [unprocessed, setUnprocessed] = useState(null);

  useEffect(() => {
    const fetchUnprocessed = async () => {
      try {
        const data = await getUnprocessed();
        setUnprocessed(data);
      } catch {
        setUnprocessed(null);
      }
    };
    fetchUnprocessed();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Institutional Analytics</h1>
              <p className="mt-1 text-sm text-slate-500">
                Sentiment trends, environmental stressors, and risk signals tracked across confessions.
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center text-slate-500 text-sm">
            Loading analytics...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700 text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{m.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{m.value}</p>
                  {m.sub && <p className="mt-1 text-xs text-slate-500 capitalize">{m.sub}</p>}
                </div>
              ))}
            </div>

            {unprocessed && unprocessed.unprocessed > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm col-span-full">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-2" />
                  <div>
                    <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">
                      Unprocessed confessions
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-amber-900">
                      {unprocessed.unprocessed} of {unprocessed.total}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      These confessions were stored but not analyzed — likely because they contain no campus-related keywords.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {unprocessed.likely_reasons.map((reason, i) => (
                        <span key={i} className="text-xs bg-amber-100 border border-amber-200 text-amber-700 px-2 py-1 rounded-full">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sentiment Timeline Chart */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Sentiment over time</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Positive vs negative confession counts grouped by {groupBy}
                  </p>
                </div>
                <div className="flex rounded-full border border-slate-200 overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => setGroupBy("month")}
                    className={`px-4 py-1.5 transition ${
                      groupBy === "month"
                        ? "bg-[#004687] text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setGroupBy("year")}
                    className={`px-4 py-1.5 transition ${
                      groupBy === "year"
                        ? "bg-[#004687] text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Year
                  </button>
                </div>
              </div>

              {timelineLoading ? (
                <p className="text-sm text-slate-400 text-center py-10">Loading timeline...</p>
              ) : timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", borderColor: "#e2e8f0", fontSize: "12px" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                    <Line
                      type="monotone"
                      dataKey="positive"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                      name="Positive"
                    />
                    <Line
                      type="monotone"
                      dataKey="negative"
                      stroke="#f87171"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#f87171" }}
                      activeDot={{ r: 6 }}
                      name="Negative"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">No timeline data available.</p>
              )}
            </div>

            {/* Positive & Negative split */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <h2 className="text-lg font-semibold text-slate-900">What's working</h2>
                </div>
                {positivePattern && (
                  <p className="text-xs text-slate-400 mb-4">{positivePattern}</p>
                )}
                {positiveAspects.length > 0 ? (
                  <div className="space-y-3">
                    {positiveAspects.map((a) => {
                      const trend = TREND_ICONS[a.trend] || TREND_ICONS.stable;
                      return (
                        <div key={a.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              {ASPECT_LABELS[a.name] || a.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${trend.color}`}>
                                {trend.symbol}
                              </span>
                              <SentimentBadge score={a.score} />
                            </div>
                          </div>
                          <ScoreBar score={a.score} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No clearly positive aspects detected yet.</p>
                )}
                {positiveSignals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    {positiveSignals.map((s, i) => (
                      <div key={i} className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  <h2 className="text-lg font-semibold text-slate-900">Needs attention</h2>
                </div>
                {negativePattern && (
                  <p className="text-xs text-slate-400 mb-4">{negativePattern}</p>
                )}
                {negativeAspects.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {negativeAspects.map((a) => {
                      const trend = TREND_ICONS[a.trend] || TREND_ICONS.stable;
                      return (
                        <div key={a.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              {ASPECT_LABELS[a.name] || a.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${trend.color}`}>
                                {trend.symbol}
                              </span>
                              <SentimentBadge score={a.score} />
                            </div>
                          </div>
                          <ScoreBar score={a.score} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {negativeSignals.length > 0 ? (
                  <div className="space-y-2">
                    {negativeSignals.map((s, i) => (
                      <div
                        key={i}
                        className={`text-xs border rounded-xl px-3 py-2 ${
                          SEVERITY_COLORS[s.severity?.toLowerCase()] || SEVERITY_COLORS.low
                        }`}
                      >
                        {s.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No negative signals detected yet.</p>
                )}
              </div>
            </div>

            {/* Donut Charts Side by Side */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Sentiment Distribution */}
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Sentiment distribution</h2>
                <p className="text-xs text-slate-400 mb-5">
                  Overall emotional tone across all processed confessions
                </p>
                {sentimentPieData.length > 0 ? (
                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={sentimentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                        >
                          {sentimentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-10 text-center">No sentiment distribution data found.</p>
                )}
              </div>

              {/* Most Mentioned Topics */}
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Most mentioned topics</h2>
                <p className="text-xs text-slate-400 mb-5">
                  How often each aspect appears across all imported confessions
                </p>
                {aspectFrequency.length > 0 ? (
                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={aspectFrequency.sort((a, b) => b.count - a.count)}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="term"
                        >
                          {aspectFrequency.sort((a, b) => b.count - a.count).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={['#004687','#f87171','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#64748b','#f43f5e'][index % 9]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No data detected.</p>
                )}
              </div>
            </div>

            {/* Aspect Sentiment Breakdown */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Aspect sentiment breakdown</h2>
              <p className="text-xs text-slate-400 mb-5">
                Percentages represent the sentiment polarity density of collected public mentions for each aspect.
              </p>

              {aspects.length > 0 ? (() => {
                // Process data to be all positive values for left-alignment
                const chartData = [...aspects]
                  .filter((a, index, self) => index === self.findIndex((b) => b.name === a.name))
                  .filter((a) => Math.abs(a.score) > 0.2)
                  .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                  .map(a => ({
                    name: ASPECT_LABELS[a.name] || a.name,
                    percentage: Math.round(Math.abs(a.score) * 100),
                    label: a.score > 0 ? "Positive" : "Negative",
                    barValue: Math.abs(a.score), // Used for width
                    fill: a.score > 0 ? '#10b981' : '#f87171',
                  }));

                return (
                  <ResponsiveContainer width="100%" height={chartData.length * 48}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" domain={[0, 1]} hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 13, fill: '#64748b' }}
                        width={140}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                        formatter={(value, name, props) => [
                          `${props.payload.percentage}% ${props.payload.label.toLowerCase()}`,
                          'Sentiment'
                        ]}
                      />
                      <Bar dataKey="barValue" radius={[0, 4, 4, 0]} barSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })() : (
                <p className="text-sm text-slate-400">No aspect data available.</p>
              )}
            </div>

            {/* Analytics Snapshot */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Analytics snapshot</h2>
              <p className="text-xs text-slate-400 mb-6">
                Real-time pulse of campus climate and student feedback trends
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5" title="This is the #1 topic students are currently complaining about.">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary risk</p>
                  <p className="mt-2 text-md font-semibold text-slate-900 capitalize">
                    {analytics?.primary_risk_driver?.driver
                      ? ASPECT_LABELS[analytics.primary_risk_driver.driver] || analytics.primary_risk_driver.driver
                      : "Not enough data to determine"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5" title="Unstable means there is a lot of recent confusion or conflict.">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stability</p>
                  <p className="mt-2 text-md font-semibold text-slate-900 capitalize">
                    {analytics?.sentiment_volatility?.stability?.replace(/_/g, " ") || "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5" title="A negative number means negativity is spreading faster than usual.">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Velocity</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {analytics.sentiment_velocity.velocity.toFixed(3)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5" title="High percentage means everyone feels the same way.">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consensus</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {Math.round(analytics.consensus_score * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {analytics.consensus_score < 0.25
                      ? "Students are widely divided in sentiment"
                      : analytics.consensus_score < 0.5
                      ? "Some agreement but opinions vary"
                      : analytics.consensus_score < 0.75
                      ? "Moderate agreement among students"
                      : "Students largely agree in sentiment"}
                  </p>
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
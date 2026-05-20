import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAnalytics } from "../../services/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const ASPECT_LABELS = {
  academic_stress: "Academic Stress",
  faculty_behavior: "Faculty Behavior",
  administration: "Administration",
  facilities: "Campus Facilities",
  student_politics: "Student Politics",
  mental_health: "Student Mental Health",
  cost: "Tuition & Costs",
  services_transit: "Transit & Services",
  
  // Keep your old ones as safety fallbacks just in case
  faculty: "Faculty & Professors",
  workload: "Workload Management",
  scheduling: "Exam & Class Scheduling",
  enrollment: "Pre-Enrollment & Admin",
  experience: "Student Experience",
  ambience: "Campus Atmosphere",
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
  const pct = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
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
  return <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Neutral</span>;
}

function AspectBar({ term, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  
  // 1. Create a "friendly" label by removing underscores and capitalizing words
  const friendlyLabel = String(term)
    .replace(/_/g, " ") // replace _ with space
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 text-xs text-slate-600 truncate shrink-0">
        {/* It will try to use your dictionary, but if it fails, it uses the auto-formatted label */}
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

  const aspectFrequency = analytics?.aspect_frequency?.aspects || [];
  const maxCount = Math.max(...aspectFrequency.map((a) => a.count), 1);

  const aspects = analytics?.aspects || [];
  const positiveAspects = [...aspects]
    .filter((a) => a.score > 0.1)
    .sort((a, b) => b.score - a.score);
  const negativeAspects = [...aspects]
    .filter((a) => a.score < 0)
    .sort((a, b) => a.score - b.score);

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
      label: "Sentiment volatility",
      value: analytics?.sentiment_volatility?.volatility?.toFixed(2) ?? "—",
      sub: analytics?.sentiment_volatility?.stability ?? null,
    },
    {
      label: "Campus Academic Index",
      value: analytics?.academic_health_index?.score?.toFixed(2) ?? "—",
      sub: analytics?.academic_health_index?.label ?? null,
    },
  ];

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
            {/* KPI Cards (Optimized layout Grid to 3 Columns) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{m.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{m.value}</p>
                  {m.sub && <p className="mt-1 text-xs text-slate-500 capitalize">{m.sub}</p>}
                </div>
              ))}
            </div>

            {/* Positive & Negative split */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Positive drivers */}
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

              {/* Negative signals */}
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

            {/* Sentiment Distribution Pie Chart */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Sentiment distribution</h2>
              <p className="text-xs text-slate-400 mb-5">
                The balance of overall emotional tones across all processed confessions
              </p>
              
              {sentimentPieData.length > 0 ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={sentimentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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

            {/* Most mentioned aspects */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Most mentioned topics</h2>
              <p className="text-xs text-slate-400 mb-5">
                How often each aspect appears across all imported confessions
              </p>
              {aspectFrequency.length > 0 ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={aspectFrequency.sort((a, b) => b.count - a.count)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60} 
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="term"
                      >
                        {aspectFrequency
                        .sort((a, b) => b.count - a.count)
                        .map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            // You can define a custom array of hex codes here:
                            fill={[
                              '#004687', // Primary Brand Color
                              '#f87171', 
                              '#10b981', 
                              '#f59e0b', 
                              '#8b5cf6', 
                              '#ec4899', 
                              '#06b6d4',
                              '#64748b'
                            ][index % 8]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data detected.</p>
              )}
            </div>

            {/* Analytics Snapshot - Large Grid Layout */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Analytics snapshot</h2>
              <p className="text-xs text-slate-400 mb-6">
                Real-time pulse of campus climate and student feedback trends
              </p>
              
              {/* Changed grid-cols-4 to grid-cols-2 for larger cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5"
                  title="This is the #1 topic students are currently complaining about. It is the biggest threat to campus morale right now."
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary risk</p>
                  <p className="mt-2 text-md font-semibold text-slate-900 capitalize">
                    {analytics?.primary_risk_driver?.driver ? ASPECT_LABELS[analytics.primary_risk_driver.driver] : "N/A"}
                  </p>
                </div>
                
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5"
                  title="This tells us if student mood is consistent or 'all over the place.' Unstable means there is a lot of recent confusion or conflict."
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stability</p>
                  <p className="mt-2 text-md font-semibold text-slate-900 capitalize">
                    {analytics?.sentiment_volatility?.stability?.replace(/_/g, " ") || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5"
                  title="This measures the 'speed' of change. A negative number means negativity is spreading or intensifying faster than usual."
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Velocity</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {analytics.sentiment_velocity.velocity.toFixed(3)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5"
                  title="This shows if students agree. High percentage means everyone feels the same way. Low percentage means students are divided and arguing."
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consensus</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {Math.round(analytics.consensus_score * 100)}%
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
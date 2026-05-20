import { TrendingUp, TrendingDown, Minus, Zap, Activity, BarChart2 } from "lucide-react";

const BRAND = "#004687";

function AnimatedBar({ pct, colorClass = "bg-[#004687]" }) {
  // Render a static bar (no entrance animation)
  const width = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

/* ── human-friendly translations ── */
function humanVolatility(stability, volatility) {
  if (stability === "stable")   return { label: "Stable",  sub: "Vibe is steady over time",        color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
  if (stability === "unstable") return { label: "Unstable", sub: "Vibe is fluctuating over time",   color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-100"   };
  return                               { label: "Mixed",    sub: "Some variation in vibe over time", color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-100"   };
}

function humanAlignment(alignment) {
  if (alignment == null) {
    return { label: "Unknown", sub: "Aspect alignment unavailable", color: "text-slate-400" };
  }

  const score = Math.max(0, Math.min(1, alignment));

  if (score >= 0.8) return { label: "Highly Aligned", sub: "Feedback is consistent across key areas", color: "text-emerald-600" };
  if (score >= 0.6) return { label: "Aligned", sub: "Most areas feel consistent to guests", color: "text-emerald-600" };
  if (score >= 0.4) return { label: "Mixed", sub: "Consistency varies by aspect", color: "text-amber-600" };
  if (score >= 0.2) return { label: "Misaligned", sub: "Guest feedback differs across areas", color: "text-red-500" };
  return { label: "Highly Misaligned", sub: "Strong gaps between aspect experiences", color: "text-red-500" };
}

function humanTrend(trendLabel) {
  if (trendLabel === "improving") return { label: "Improving",  sub: "Customers are responding more positively", color: "text-emerald-600", icon: TrendingUp,   iconColor: "text-emerald-500" };
  if (trendLabel === "declining") return { label: "Declining",  sub: "Satisfaction has been dropping",           color: "text-red-600",     icon: TrendingDown, iconColor: "text-red-500"     };
  return                                 { label: "Holding Steady", sub: "No significant change recently",       color: "text-slate-600",   icon: Minus,        iconColor: "text-slate-400"   };
}

function humanDataQuality(quality) {
  if (quality === "high")      return { label: "High",      sub: "Insights are well-supported",   color: "text-emerald-600", pct: 90 };
  if (quality === "moderate")  return { label: "Moderate",  sub: "Enough data to act on",          color: "text-amber-600",   pct: 55 };
  if (quality === "low")       return { label: "Low",       sub: "More reviews will improve this", color: "text-red-500",     pct: 25 };
  if (quality === "very_low")  return { label: "Very low",  sub: "Too few reviews for confidence", color: "text-red-500",     pct: 10 };
  if (quality === "no_data")   return { label: "No data",   sub: "No reviews available yet",      color: "text-slate-400",   pct: 0 };
  return                              { label: "Unknown",   sub: "Data quality unavailable",       color: "text-slate-400",   pct: 0 };
}

function humanReviewVelocity(velocity) {
  const status = velocity?.status;
  const recentPerWeek = Number(velocity?.recent_per_week ?? 0);
  const changePct = velocity?.change_pct;

  if (status === "insufficient_data") {
    return {
      value: "--",
      sub: "Not enough recent reviews yet",
      color: "text-slate-400",
    };
  }

  const value = `${recentPerWeek.toFixed(1)}/wk`;

  let sub = "Holding steady vs prior period";
  let color = "text-slate-600";

  if (changePct == null) {
    sub = "New activity vs prior period";
    color = "text-amber-600";
  } else if (changePct >= 0.1) {
    sub = `Up ${Math.round(changePct * 100)}% vs prior period`;
    color = "text-emerald-600";
  } else if (changePct <= -0.1) {
    sub = `Down ${Math.round(Math.abs(changePct) * 100)}% vs prior period`;
    color = "text-red-600";
  }

  return { value, sub, color };
}

/* ── tile ── */
function ContextTile({ icon: Icon, iconColor, label, value, valueColor, sub, bottom }) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${BRAND}12` }}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} style={iconColor ? {} : { color: BRAND }} />
        </div>
      </div>
      <div>
        <p className={`text-xl font-bold leading-none ${valueColor}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1.5 leading-snug">{sub}</p>
      </div>
      {bottom && <div className="mt-auto pt-1">{bottom}</div>}
    </div>
  );
}

const Skeleton = () => (
  <div className="animate-pulse bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
    <div className="h-4 w-32 bg-gray-200 rounded" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-2xl p-4 space-y-2">
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
          <div className="h-6 w-3/4 bg-gray-200 rounded" />
          <div className="h-1 w-full bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

/* ── main ── */
export default function ExecutiveSummary({ dashboard = {}, loading = false }) {

  if (loading) return <Skeleton />;

  const businessHealth = dashboard.business_health ?? {};
  const businessHealthRaw = businessHealth.raw ?? {};
  const businessHealthBreakdown = businessHealth.breakdown ?? {};
  const sentimentVolatility = dashboard.sentiment_volatility ?? {};
  const vibeVolatility = dashboard.vibe_volatility ?? {};
  const reviewVelocity = dashboard.review_velocity ?? {};

  /* ── derived values ── */
  const trendLabel = businessHealthRaw.trend_label ?? "stable";
  const trendStatus = humanTrend(trendLabel);
  const TrendStatusIcon = trendStatus.icon;

  const consistencyStatus = humanAlignment(businessHealthBreakdown.alignment);
  const dataQualityStatus = humanDataQuality(businessHealthRaw.data_quality);
  const reviewVelocityStatus = humanReviewVelocity(reviewVelocity);

  return (
    <div className="space-y-3">

      {/* section label */}


      {/* 4 tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* 1 — Data quality */}
        <ContextTile
          icon={BarChart2}
          label="Data Quality"
          value={dataQualityStatus.label}
          valueColor={dataQualityStatus.color}
          sub={dataQualityStatus.sub}
          bottom={<AnimatedBar pct={dataQualityStatus.pct} colorClass="bg-[#004687]" delay={0} />}
          delay={80}
        />

        {/* 2 — Temporal vibe stability */}
        <ContextTile
          icon={Zap}
          label="Experience Consistency"
          value={consistencyStatus.label}
          valueColor={consistencyStatus.color}
          sub={consistencyStatus.sub}
          delay={160}
        />

        {/* 3 — Trend direction */}
        <ContextTile
          icon={TrendStatusIcon}
          iconColor={trendStatus.iconColor}
          label="Vibe Trend Direction"
          value={trendStatus.label}
          valueColor={trendStatus.color}
          sub={trendStatus.sub}
          delay={240}
        />

        {/* 4 — Review velocity */}
        <ContextTile
          icon={Activity}
          label="Review Velocity"
          value={reviewVelocityStatus.value}
          valueColor={reviewVelocityStatus.color}
          sub={reviewVelocityStatus.sub}
          delay={320}
        />

      </div>
    </div>
  );
}
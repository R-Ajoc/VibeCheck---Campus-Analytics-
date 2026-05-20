import { useState } from "react";
import { Wrench, TrendingUp, Eye, CircleAlert } from "lucide-react";

const BRAND = "#004687";

const ASPECT_ORDER = ["food", "service", "staff", "cleanliness", "ambience", "price", "location", "experience"];

function formatName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const ACTION_CONFIG = {
  fix: {
    icon: Wrench,
    label: "Needs attention",
    bg: "bg-red-50",
    border: "border-red-100",
    text: "text-red-700",
    iconColor: "text-red-500",
    bar: "bg-red-400",
    pill: "bg-red-100 text-red-700",
  },
  leverage: {
    icon: TrendingUp,
    label: "Your strength",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    iconColor: "text-emerald-500",
    bar: "bg-emerald-400",
    pill: "bg-emerald-100 text-emerald-700",
  },
  monitor: {
    icon: Eye,
    label: "Keep an eye on",
    bg: "bg-slate-50",
    border: "border-slate-100",
    text: "text-slate-600",
    iconColor: "text-slate-400",
    bar: "bg-slate-300",
    pill: "bg-slate-100 text-slate-600",
  },
};

// Dominant sentiment = what customers feel most about this aspect
function getDominantSentiment(aspect) {
  const { risk_score, positive_score, neutral_score } = aspect;
  if (positive_score >= risk_score && positive_score >= neutral_score) return "positive";
  if (risk_score >= positive_score && risk_score >= neutral_score) return "negative";
  return "neutral";
}

// Single headline score: positive for leverage, risk for fix, neutral blend for monitor
function getHeadlineScore(aspect) {
  const dominant = getDominantSentiment(aspect);
  if (dominant === "positive") return { value: aspect.positive_score, label: "Positive signal" };
  if (dominant === "negative") return { value: aspect.risk_score,     label: "Aspect risk" };
  return { value: aspect.neutral_score, label: "Mixed signal" };
}

function AspectCard({ name, aspect, isReliable }) {
  const cfg = ACTION_CONFIG[aspect.action_priority] ?? ACTION_CONFIG.monitor;
  const Icon = cfg.icon;
  const { value, label } = getHeadlineScore(aspect);
  const barPct = Math.min(value, 100);

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 transition-shadow duration-200 hover:shadow-sm ${cfg.bg} ${cfg.border}`}>
      {/* top row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{formatName(name)}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cfg.pill}`}>
          <Icon className={`w-3 h-3 ${cfg.iconColor}`} />
          {cfg.label}
        </span>
      </div>

      {/* headline number */}
      <div>
        <p className={`text-2xl font-bold leading-none ${cfg.text}`}>
          {isReliable ? `${value.toFixed(0)}%` : "—"}
        </p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>

      {/* single bar */}
      <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
          style={{ width: isReliable ? `${barPct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function EmptyCard({ name }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
      <CircleAlert className="w-4 h-4 text-gray-300" />
      <p className="text-xs text-gray-400 font-medium">{formatName(name)}</p>
      <p className="text-[10px] text-gray-300">No mentions yet</p>
    </div>
  );
}

export default function AspectIntelligenceGrid({ data = {} }) {
  const aspects   = data.aspects ?? {};
  const isReliable = data.meta?.is_reliable ?? false;

  const fixCount      = Object.values(aspects).filter(a => a.action_priority === "fix").length;
  const leverageCount = Object.values(aspects).filter(a => a.action_priority === "leverage").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: BRAND }}>
            Aspect Breakdown
          </p>
          <h2 className="text-lg font-semibold text-gray-900">Aspect Risk Probabilities</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Local risk score for each category, based on that aspect's own feedback mix.
          </p>
        </div>
        {/* summary chips */}
        <div className="flex gap-2 mt-1">
          {fixCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
              <Wrench className="w-3 h-3" /> {fixCount} to fix
            </span>
          )}
          {leverageCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-3 h-3" /> {leverageCount} strength{leverageCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-5">
        Based on {data.meta?.sample_size ?? "—"} customer mentions
      </p>

      {/* grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ASPECT_ORDER.map((name) => {
          const aspect = aspects[name];
          if (!aspect) return <EmptyCard key={name} name={name} />;
          return <AspectCard key={name} name={name} aspect={aspect} isReliable={isReliable} />;
        })}
      </div>

      {/* reliability notice */}
      {!isReliable && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
          <CircleAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">More reviews are needed before scores are fully reliable.</p>
        </div>
      )}
    </div>
  );
}
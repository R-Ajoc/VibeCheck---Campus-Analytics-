import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { GraphIcon } from "../icons/AnalyticsIcons";
import ReviewProgressState from "./ReviewProgressState";

const BRAND = "#004687";
const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MIN_DAYS = 90;

/* ── score → blue shade (matching image palette) ── */
function getCell(score, inRange, hasData) {
  if (!inRange || !hasData) return { bg: "#f1f5f9", border: "transparent", textColor: "#94a3b8" };
  if (score >= 4.5) return { bg: "#003a6e", border: "#003a6e", textColor: "#fff" };
  if (score >= 3.5) return { bg: BRAND,     border: BRAND,     textColor: "#fff" };
  if (score >= 2.5) return { bg: "#5b9bd5", border: "#5b9bd5", textColor: "#fff" };
  if (score >= 1.5) return { bg: "#a8c8eb", border: "#a8c8eb", textColor: BRAND  };
  return               { bg: "#dbeafe",   border: "#bfdbfe",  textColor: BRAND  };
}

function getLabel(score) {
  if (score >= 4.5) return "Excellent";
  if (score >= 3.5) return "Good";
  if (score >= 2.5) return "Mixed";
  if (score >= 1.5) return "Poor";
  return "Critical";
}

/* ── parse daily data into map keyed by ISO date ── */
function buildDateMap(rawArr) {
  const map = new Map();
  if (!Array.isArray(rawArr)) return map;
  rawArr.forEach(item => {
    if (item?.period && item?.avg_score != null) {
      map.set(String(item.period), Number(item.avg_score));
    }
  });
  return map;
}

/* ── build grid: rows = Mon–Sun, cols = weeks ── */
function buildGrid(dateMap, numDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (numDays - 1));

  // Rewind to nearest Monday
  const dow = start.getDay(); // 0=Sun
  const toMon = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + toMon);

  // Build week columns: each col is an array of 7 days (Mon–Sun)
  const weeks = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso    = cursor.toISOString().slice(0, 10);
      const inRange = cursor >= new Date(today.getTime() - (numDays - 1) * 86400000) && cursor <= today;
      const score  = dateMap.get(iso) ?? null;
      week.push({ date: iso, score, hasData: score != null, inRange, month: cursor.getMonth(), day: cursor.getDate() });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks; // weeks[col][row 0=Mon..6=Sun]
}

/* ── month label above columns ── */
function MonthRow({ weeks }) {
  let lastMonth = null;
  return (
    <div className="flex mb-2" style={{ paddingLeft: 44 }}>
      {weeks.map((week, wi) => {
        const firstVisible = week.find(d => d.inRange);
        const month = firstVisible?.month;
        const show  = month != null && month !== lastMonth;
        if (show) lastMonth = month;
        return (
          <div key={wi} style={{ width: 32, marginRight: 4, flexShrink: 0 }}>
            <span className="text-[10px] font-medium text-gray-400">
              {show ? MONTHS[month] : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── tooltip ── */
function Tooltip({ cell, visible }) {
  if (!visible || !cell?.inRange) return null;
  const d = new Date(cell.date);
  return (
    <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
      <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-[11px] whitespace-nowrap shadow-xl">
        <p className="font-semibold">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
        {cell.hasData
          ? <p className="text-gray-300 mt-0.5">{getLabel(cell.score)} · {cell.score.toFixed(2)}/5</p>
          : <p className="text-gray-400 mt-0.5">No snapshot</p>}
      </div>
      <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
    </div>
  );
}

/* ── legend ── */
function Legend() {
  const steps = [
    { bg: "#dbeafe", label: "" },
    { bg: "#a8c8eb", label: "" },
    { bg: "#5b9bd5", label: "" },
    { bg: BRAND,     label: "" },
    { bg: "#003a6e", label: "" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-gray-400 mr-1">Low</span>
      {steps.map((s, i) => (
        <div key={i} className="w-5 h-5 rounded-md" style={{ background: s.bg }} />
      ))}
      <span className="text-[11px] text-gray-400 ml-1">High</span>
    </div>
  );
}

/* ── empty state ── */
function EmptyState() {
  return (
    <div className="h-52 flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <GraphIcon className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-700">Not enough data yet</p>
      <p className="text-xs text-gray-400 max-w-xs">
        At least 90 days of vibe snapshots are needed to display the heatmap.
      </p>
    </div>
  );
}

/* ── main ── */
export default function VibeHeatmap({ data = {}, vibeOverTime = {} }) {
  const [hoveredKey, setHoveredKey] = useState(null); // "wi-di"

  // Always use 90D daily data
  const rawData    = Array.isArray(data?.["7D"])
    ? data["7D"]
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];
  const dateMap    = useMemo(() => buildDateMap(rawData), [rawData]);
  const weeks      = useMemo(() => buildGrid(dateMap, MIN_DAYS), [dateMap]);

  // Check if we have at least 90 days of snapshots
  const uniqueDays  = dateMap.size;
  const reliabilityMeta = vibeOverTime?.meta ?? data?.meta;
  const hasEnough   = uniqueDays >= MIN_DAYS && reliabilityMeta?.is_reliable !== false;

  // Stats
  const scores     = rawData.map(d => d.avg_score).filter(s => s != null);
  const avg        = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vibe Heatmap</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Daily vibe snapshot · last 90 days</p>
        </div>
        <Legend />
      </div>

      {!hasEnough ? <EmptyState /> : (
        <div className="overflow-x-auto">
          {/* month labels */}
          <MonthRow weeks={weeks} />

          {/* grid */}
          <div className="flex">
            {/* day labels */}
            <div className="flex flex-col gap-1 mr-2" style={{ paddingTop: 0 }}>
              {DAYS.map(d => (
                <div key={d} className="h-8 flex items-center">
                  <span className="text-[11px] font-medium text-gray-400 w-8">{d}</span>
                </div>
              ))}
            </div>

            {/* week columns */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => {
                    const key    = `${wi}-${di}`;
                    const hov    = hoveredKey === key;
                    const colors = getCell(cell.score, cell.inRange, cell.hasData);
                    return (
                      <div
                        key={di}
                        className="relative"
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        <div
                          className="w-8 h-8 rounded-md transition-transform duration-100 cursor-default"
                          style={{
                            background: colors.bg,
                            transform: hov ? "scale(1.18)" : "scale(1)",
                            boxShadow: hov ? "0 3px 10px rgba(0,70,135,0.18)" : "none",
                          }}
                        />
                        {hov && <Tooltip cell={cell} visible />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* footer stat */}
          {avg && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: BRAND }} />
              <span className="text-xs text-gray-400">90-day avg vibe score</span>
              <span className="text-xs font-semibold text-gray-800">{avg} / 5</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
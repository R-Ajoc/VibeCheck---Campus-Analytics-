import { ShieldCheck, AlertTriangle } from "lucide-react";

function ReliabilityFooter({
  isReliable = false,
  sampleSize = 0,
  minRequired = 10,
  unitLabel = "reviews",
}) {
  return (
    <div className="border-t border-slate-200 mt-5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isReliable ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}

          <span
            className={`text-xs font-medium ${
              isReliable ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {isReliable ? "Reliable Insights" : "Limited Data"}
          </span>
        </div>

        <span className="text-xs text-slate-500">
          Based on {sampleSize} {unitLabel}
        </span>
      </div>
    </div>
  );
}

export default ReliabilityFooter;
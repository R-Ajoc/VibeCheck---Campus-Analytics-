import { PositiveIcon, NegativeIcon } from '../icons/SentimentIcons';

export default function SentimentBreakdown({ positive, negative }) {
  const total = positive + negative;
  const positivePercent = total > 0 ? ((positive / total) * 100).toFixed(0) : 0;
  const negativePercent = total > 0 ? ((negative / total) * 100).toFixed(0) : 0;

  // Calculate intensity/average (weighted by sentiment)
  const intensity = total > 0 ? ((positive * 5 + negative * 1) / (total * 5)).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Sentiment icons with percentages */}
      <div className="flex items-center justify-around">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <PositiveIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-emerald-600">{positivePercent}%</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <NegativeIcon className="w-8 h-8 text-rose-600" />
          </div>
          <p className="text-sm font-bold text-rose-600">{negativePercent}%</p>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-200">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${total > 0 ? (positive / total) * 100 : 0}%` }}
        ></div>
        <div
          className="bg-rose-500 transition-all"
          style={{ width: `${total > 0 ? (negative / total) * 100 : 0}%` }}
        ></div>
      </div>

      {/* Intensity label */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
        <span className="font-medium">Positive Intensity</span>
        <span className="font-semibold">{intensity}/5 Avg</span>
      </div>
    </div>
  );
}

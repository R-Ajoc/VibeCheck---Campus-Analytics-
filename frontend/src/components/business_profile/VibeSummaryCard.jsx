export default function VibeSummaryCard({ summary, reviewCount }) {
  const hasSummary = summary && summary.trim().length > 0;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            What Guests Are Saying
          </h3>

          {/* MAIN STATE LOGIC */}
          {hasSummary ? (
            <p className="text-sm text-gray-700 leading-relaxed italic">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No summary available yet. We’re still analyzing guest reviews.
            </p>
          )}

          {/* review count stays visible */}
          {reviewCount ? (
            <p className="text-xs text-gray-500 mt-3">
              Based on {reviewCount} guest reviews
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-3">
              No reviews yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
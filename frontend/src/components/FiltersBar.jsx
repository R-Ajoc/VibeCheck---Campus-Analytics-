export default function FiltersBar({ sortBy, onSortChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between py-6 px-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="font-medium text-gray-700">Sort by:</span>
      </div>

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent bg-white text-gray-700 font-medium shadow-sm transition"
      >
        <option value="vibe-score-high">Highest Vibe Score</option>
        <option value="vibe-score-low">Lowest Vibe Score</option>
        <option value="most-reviewed">Most Reviewed</option>
        <option value="trending">Trending Up</option>
        <option value="newest">Newest</option>
      </select>
    </div>
  );
}

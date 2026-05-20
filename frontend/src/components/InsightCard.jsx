export default function InsightCard({ icon, title, subtitle, resorts, type }) {
  const getBackgroundColor = (type) => {
    switch (type) {
      case 'positive':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200';
      case 'controversial':
        return 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200';
      case 'rising':
        return 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200';
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'controversial':
        return 'text-amber-600';
      case 'rising':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTitleColor = (type) => {
    switch (type) {
      case 'positive':
        return 'text-green-900';
      case 'controversial':
        return 'text-amber-900';
      case 'rising':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 shadow-sm hover:shadow-md transition ${getBackgroundColor(type)}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-3xl ${getIconColor(type)}`}>{icon}</div>
        <div>
          <h3 className={`text-lg font-bold ${getTitleColor(type)}`}>{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {resorts && resorts.length > 0 ? (
          resorts.slice(0, 3).map((resort, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 px-3 rounded bg-white/60">
              <span className="font-medium text-gray-800 text-sm">{resort.name}</span>
              {resort.score && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  resort.score >= 0.6 ? 'bg-green-100 text-green-700' :
                  resort.score >= 0.4 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {(resort.score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm py-2">No data available</p>
        )}
      </div>
    </div>
  );
}

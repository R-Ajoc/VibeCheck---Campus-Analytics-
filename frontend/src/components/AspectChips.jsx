export default function AspectChips({ aspects = [] }) {
  const getColor = (aspect) => {
    switch (aspect?.toLowerCase()) {
      case 'food':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'service':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'staff':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cleanliness':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'price':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'ambience':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'location':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'experience':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (!aspects.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {aspects.map((a, idx) => (
        <span
          key={idx}
          className={`px-2.5 py-1 text-xs rounded-sm border font-medium ${getColor(
            a.aspect
          )}`}
        >
          {a.aspect}
        </span>
      ))}
    </div>
  );
}
export default function AspectSentimentChip({ aspect, sentiment }) {
  // Color mapping by aspect type
  const getAspectColor = () => {
    const aspectLower = aspect.toLowerCase();
    
    // Food-related
    if (aspectLower.includes('food') || aspectLower.includes('cuisine') || aspectLower.includes('meal')) {
      return 'bg-orange-100 text-orange-700 border border-orange-200';
    }
    // Service-related
    if (aspectLower.includes('service') || aspectLower.includes('staff') || aspectLower.includes('staff')) {
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
    // Cleanliness
    if (aspectLower.includes('clean') || aspectLower.includes('hygiene')) {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    }
    // Ambience/Atmosphere
    if (aspectLower.includes('ambience') || aspectLower.includes('atmosphere') || aspectLower.includes('vibe')) {
      return 'bg-purple-100 text-purple-700 border border-purple-200';
    }
    // Location/Price
    if (aspectLower.includes('location') || aspectLower.includes('price') || aspectLower.includes('value')) {
      return 'bg-pink-100 text-pink-700 border border-pink-200';
    }
    // Experience
    if (aspectLower.includes('experience') || aspectLower.includes('comfort')) {
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    }
    // Default
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getAspectColor()}`}>
      <span className="capitalize">{aspect}</span>
    </div>
  );
}

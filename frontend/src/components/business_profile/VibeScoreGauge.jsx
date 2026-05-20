import getVibeLevelFromScore from "../../utils/vibeLabel";
export default function VibeScoreGauge({ score, label, reviewCount, positive = 0, negative = 0 }) {
  // Score is 0-5 scale from API
  const percentage = (score / 5) * 100;
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getGaugeColor = () => {
    if (score >= 4.5) return '#0064c7'; // darker blue
    if (score >= 4) return '#0073e6'; // blue
    if (score >= 3.5) return '#3b82f6'; // lighter blue
    if (score >= 3) return '#0084ff'; // medium blue
    if (score >= 2) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };


  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          
          {/* Animated progress circle */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={getGaugeColor()}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900">{score.toFixed(1)}</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">{getVibeLevelFromScore(score, reviewCount).label}</h3>

      {/* Sentiment counts */}
      {/* <div className="flex gap-4 justify-center w-full">
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{positive}</p>
          <p className="text-xs text-gray-600">Positive</p>
        </div>  
        <div className="text-center">
          <p className="text-lg font-bold text-rose-600">{negative}</p>
          <p className="text-xs text-gray-600">Negative</p>
        </div>
      </div> */}
    </div>
  );
}

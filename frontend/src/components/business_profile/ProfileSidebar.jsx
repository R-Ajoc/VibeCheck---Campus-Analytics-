import VibeScoreGauge from './VibeScoreGauge';
import SentimentBreakdown from './SentimentBreakdown';
import { BASE_URL } from '../../services/api';
import ImagePlaceholder from '../icons/ImagePlaceholder';

function ProfileSidebar({ business, latestVibe, getVibeLevelFromScore }) {
  const vibeScore = latestVibe?.vibe_score || 0;

  return (
    <aside className="w-full lg:w-[500px] h-full bg-white shadow-lg flex flex-col flex-shrink-0 overflow-hidden">
      
      {/* Hero Image */}
      <div className="relative h-52 flex-shrink-0">
        {business.image_path ? (
          <img
            src={`${BASE_URL}${business.image_path}`}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImagePlaceholder className="w-16 h-16 object-cover" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-xl font-bold text-white leading-tight drop-shadow">
            {business.name}
          </h1>

          <p className="text-white/80 text-sm flex items-center gap-1.5 mt-1 drop-shadow">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {business.location}
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
           <h3 className="text-sm font-semibold text-gray-900 mb-4">
              About this place
            </h3>
          {/* Description */}
          {business.short_description && (

            <p className="text-gray-700 text-xs pb-5 leading-relaxed border-b border-gray-200">
              {business.short_description}
            </p>
          )}


          {/* Vibe Score */}
          <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
            <p className="text-xs font-semibold text-gray-600 text-center mb-4 tracking-wide">
              VIBE SCORE
            </p>

            <VibeScoreGauge
              score={vibeScore}
              label={getVibeLevelFromScore(vibeScore, latestVibe?.review_count || 0)}
              reviewCount={latestVibe?.review_count || 0}
              positive={latestVibe?.positive_count || 0}
              negative={latestVibe?.negative_count || 0}
            />
          </div>

          {/* Sentiment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              How Guests Feel
            </h3>

            <SentimentBreakdown
              positive={latestVibe?.positive_count || 0}
              negative={latestVibe?.negative_count || 0}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default ProfileSidebar;
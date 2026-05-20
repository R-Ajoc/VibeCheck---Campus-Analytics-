import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MapPin } from 'lucide-react';
import { BASE_URL } from '../services/api';
import ImagePlaceholder from './icons/ImagePlaceholder';
import getVibeLevelFromScore from '../utils/vibeLabel';

function BusinessCard({ business, vibeData, loading = false }) {

  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  

  const handleViewInsights = () => {
    navigate(`/business/${business.id}`, { state: { business } });
  };

  const vibeScore = vibeData?.overall_score || 0.5;
  const vibeLevelData = getVibeLevelFromScore(vibeScore, business.review_count);
  const reviewCount = business?.review_count || 0;
  const isNew = reviewCount < 10;


  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xs shadow-sm overflow-hidden animate-pulse">
        <div className="w-full h-56 md:h-48 lg:h-56 xl:h-64 bg-slate-100" />
        <div className="p-5">
          <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
          <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleViewInsights}
      className="bg-white border border-[#E2E8F0] rounded-xs shadow-sm hover:shadow-lg hover:-translate-y-1 transform-gpu transition-all overflow-hidden group cursor-pointer"
    >

      
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-t-xs">
        <div className="w-full h-56 md:h-48 lg:h-56 xl:h-64 bg-gray-100">
          {business.image_path && !imageError ? (
            <>
              <img
                src={`${BASE_URL}${business.image_path}`}
                alt={business.name}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                aria-busy={!imageLoaded}
                style={{ willChange: 'transform, opacity' }}
              />

              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#004687] animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <ImagePlaceholder className="w-16 h-16 text-gray-400" />
            </div>
          )}

          {/* Top-right score pill */}
          <div className="absolute top-3 right-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#0F172A] text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-[#0F172A]" />
              <span>{vibeScore ? vibeScore.toFixed(1) : '—'}</span>
            </div>
          </div>

          {/* Bottom-left status tag */}
          <div className="absolute left-3 bottom-3">
            {isNew ? (
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                New
              </div>
            ) : (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getThemeClasses(vibeLevelData.theme)}`}>
                {vibeLevelData.label}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Content Container */}
      <div className="p-5">
        {/* Location Row */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{business.location || 'Unknown Location'}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-[#0F172A] mb-2">{business.name}</h3>

        {/* Footer divider + row */}
        <div className="mt-4 border-t border-[#F1F5F9] pt-4 text-sm">
          <div className="text-slate-400">{formatNumber(reviewCount)} Verified Reviews</div>
        </div>
      </div>
    </div>
  );
}

export default memo(BusinessCard);

function formatNumber(n) {
  return Intl.NumberFormat().format(n);
}

function getThemeClasses(theme) {
  switch (theme) {
    case 'emerald': return 'bg-emerald-100 text-emerald-800';
    case 'teal': return 'bg-teal-100 text-teal-800';
    case 'cyan': return 'bg-cyan-100 text-cyan-800';
    case 'amber': return 'bg-amber-100 text-amber-800';
    case 'orange': return 'bg-orange-100 text-orange-800';
    case 'red': return 'bg-red-100 text-red-800';
    case 'crimson': return 'bg-rose-100 text-rose-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

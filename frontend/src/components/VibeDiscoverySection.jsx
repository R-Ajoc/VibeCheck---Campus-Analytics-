import React, { useMemo, useState } from 'react';
import { Search, MapPin, Bed, Smile, MessageSquare, Heart, ChevronDown } from 'lucide-react';





export default function VibeDiscoverySection({ onSearch, stats = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const renderedStats = useMemo(() => {
    return Array.isArray(stats) ? stats : [];
  }, [stats]);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <section className="w-full bg-[#F8FAFC] py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">
            Find Your Perfect Vibe
          </h2>
          <p className="text-lg text-slate-500">
            Discover resorts curated by verified guest sentiment and emotional analytics.
          </p>
        </div>

        {/* Search & Filter Container */}
        <div className="bg-white rounded-[32px] shadow-xl p-8 mb-12">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-4 ">
            <div className="flex items-center flex-1 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search resorts, locations, or names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 ml-3 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 placeholder-slate-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#004687] text-white font-bold px-10 py-3 rounded-xl hover:bg-[#003560] transition whitespace-nowrap"
            >
              Search
            </button>
          </div>

         
        </div>

      </div>
    </section>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { MoveRight } from 'lucide-react';
import BusinessCard from './BusinessCard';
import WaveBackground from './WaveBackground';
import Bubbles from './CircleBackgroud';

export default function PremiumBusinesses({ businesses = [], vibeDataMap = {} }) {
  // pick top 3 by vibe score
  const withScores = businesses.map(b => ({
    business: b,
    score: (vibeDataMap[b.id]?.overall_score ?? 0)
  }));

  const top3 = withScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.business);

  return (
    <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 ">
      <Bubbles />
      <div className="max-w-7xl mx-auto">
         
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Trending Destinations</h2>
            <p className="text-sm text-slate-500 mt-1">Hand-picked resorts with the highest verified vibe scores this month.</p>
          </div>

          <div className="ml-auto">
            <Link to="/businesses" className="inline-flex items-center text-sm text-[#0F172A] hover:text-indigo-600">
              <span className="mr-2">View all resorts</span>
              <MoveRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {top3.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No premium resorts yet</h3>
            <p className="text-gray-500 mb-4">We don't have featured resorts at the moment. Try exploring all resorts.</p>
            <Link to="/businesses" className="inline-flex items-center px-4 py-2 rounded-md bg-[#004687] text-white text-sm">Browse all resorts</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {top3.map(b => (
              <BusinessCard key={b.id} business={b} vibeData={vibeDataMap[b.id]} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

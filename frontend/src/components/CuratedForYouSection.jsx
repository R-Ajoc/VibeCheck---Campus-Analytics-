import React, { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import BusinessCard from "./BusinessCard";

import { Link } from "react-router-dom";
export default function ExploreResortsSection({
  businesses = [],
  vibeDataMap = {},
  loading = false,
  error = null,
}) {
  const sortedBusinesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => (vibeDataMap[b.id]?.overall_score ?? 0) - (vibeDataMap[a.id]?.overall_score ?? 0))
      ;
  }, [businesses, vibeDataMap]);

  return (
    <section className="w-full bg-white py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
          <div>
            <h2 className="font-bold text-3xl text-[#0F172A]">
              Explore Resorts
            </h2>
            <p className="text-slate-500 text-base mt-1">
              Browse resort destinations ranked by customer vibe insights
            </p>
          </div>

          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-[#0F172A] font-semibold bg-white hover:bg-slate-50 transition">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Sort by Rank</span>
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse"
              >
                <div className="h-44 rounded-3xl bg-slate-100 mb-6" />
                <div className="h-5 bg-slate-100 rounded w-2/3 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-6" />
                <div className="border-t pt-6">
                  <div className="h-10 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 text-red-700 px-5 py-4">
            {error}
          </div>
        ) : sortedBusinesses.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Nothing to show</h3>
            <p className="text-gray-500 mb-4">We couldn't find resorts matching your criteria right now.</p>
            <Link to="/businesses" className="inline-flex items-center px-4 py-2 rounded-md bg-[#004687] text-white text-sm">Browse all resorts</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedBusinesses.map((business) => {
              return (
                <BusinessCard
                  key={business.id}
                  business={business}
                  vibeData={vibeDataMap[business.id]}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
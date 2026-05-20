import React from 'react';
import { Settings } from 'lucide-react';

export default function OwnerAnalyticsSection() {
  return (
    <section className="w-full bg-white py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#002147] rounded-[40px] p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

            {/* Left Column: Content & Metrics */}
            <div className="flex flex-col justify-center">
              <h2 className="text-white font-bold text-5xl leading-tight">
                Master Your Resort's Narrative
              </h2>

              <p className="text-slate-300 text-lg leading-relaxed mt-6 max-w-lg">
                Stop guessing what guests think. Our analytics dashboard gives you real-time sentiment tracking, business health metrics, and actionable feedback alerts.
              </p>

              {/* Metric Cards */}
              <div className="flex gap-6 mt-10">
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex-1">
                  <div className="text-white text-3xl font-bold">94%</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-2">Vibe Accuracy</div>
                </div>
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex-1">
                  <div className="text-white text-3xl font-bold">+28%</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-2">Direct Bookings</div>
                </div>
              </div>

              {/* CTA Button */}
              <button className="mt-12 bg-white text-[#002147] font-semibold px-8 py-4 rounded-xl hover:bg-slate-100 transition-colors w-fit">
                View Dashboard Demo
              </button>
            </div>

            {/* Right Column: Analytics Card */}
            <div className="flex items-center justify-center">
              <div className="w-full bg-[#003366] rounded-3xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#38BDF8] rounded-lg w-10 h-10" />
                    <span className="text-white font-medium">Owner Analytics</span>
                  </div>
                  <Settings className="w-5 h-5 text-slate-400" />
                </div>

                {/* Bar Chart */}
                <div className="bg-black/10 p-6 rounded-2xl">
                  <div className="flex items-end justify-between gap-3 h-40">
                    {/* Bar 1 */}
                    <div className="flex-1 bg-[#38BDF8] rounded-t-md" style={{ height: '50%' }} />
                    {/* Bar 2 */}
                    <div className="flex-1 bg-[#38BDF8] rounded-t-md" style={{ height: '70%' }} />
                    {/* Bar 3 - Highest (White) */}
                    <div className="flex-1 bg-white rounded-t-md" style={{ height: '100%' }} />
                    {/* Bar 4 */}
                    <div className="flex-1 bg-[#38BDF8] rounded-t-md" style={{ height: '65%' }} />
                    {/* Bar 5 */}
                    <div className="flex-1 bg-[#38BDF8] rounded-t-md" style={{ height: '55%' }} />
                  </div>
                </div>

                {/* Footer Insight */}
                <div className="mt-6">
                  <div className="text-slate-400 text-xs uppercase tracking-widest mb-2">Top Sentiment Spike</div>
                  <div className="text-white font-semibold">
                    "Exceptional breakfast service trend"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import hero_image from '../assets/hero_image.jpg';

// HeroSection - a two-column landing hero with visual and floating analytics card
export default function HeroSection() {
  const photo = hero_image;

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* Left column */}
          <div className="flex flex-col gap-8">
            {/* <PillBadge /> */}

            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#06142b] leading-tight">
                Discover the vibe before you book.
              </h1>
              <p className="mt-4 text-lg text-[#23314b] max-w-xl">
                Unlock the truth behind thousands of reviews. VibeCheck uses advanced analytics to reveal the actual mood, service quality, and atmosphere of any resort instantly.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <ButtonFilled to="/businesses">Explore Resorts</ButtonFilled>
              <ButtonOutline to="/register-business">Register Your Resort</ButtonOutline>
            </div>
          </div>

          {/* Right column */}
          <div className="relative">
            <div className="w-full rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-100">
              <img src={photo} alt="Resort" className="w-full h-[420px] object-cover block" />
            </div>

            {/* Floating UI card */}
            <div className="absolute right-6 bottom-6 transform translate-y-4">
              <FloatingCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// function PillBadge() {
//   return (
//     <div className="inline-flex items-center gap-2 bg-[#EDE7FF] text-[#3B2F63] rounded-full px-4 py-2 text-sm font-medium w-min">
//       <span className="flex items-center justify-center w-full h-5 rounded-full bg-[#EEF4FF] text-[#6EA8FF]">✦</span>
//       <span className="pl-1">AI-Powered Resort Insights</span>
//     </div>
//   );
// }

function ButtonFilled({ children, to }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-3 px-5 py-3 bg-[#07234D] text-white rounded-lg shadow hover:bg-[#041c3d] transition"
    >
      {children}
    </Link>
  );
}

function ButtonOutline({ children, to }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-3 px-5 py-3 border border-[#07234D] text-[#07234D] rounded-lg hover:bg-[#f7fbff] transition"
    >
      {children}
    </Link>
  );
}

function FloatingCard() {
  return (
    <div className="w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 p-4 transform rotate-[-8deg] hover:rotate-[-4deg] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#07234D]">
          Vibe Analytics
        </div>

        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[#07234D]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 15L8.5 9.5L11 13L17 6"
            stroke="#07234D"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="h-px bg-gray-100 my-3" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Atmosphere</div>
          <div className="w-40">
            <ProgressBar value={85} light />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Service</div>
          <div className="w-40">
            <ProgressBar value={95} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="text-2xl font-extrabold text-[#07234D]">4.9</div>
        <div className="text-sm text-[#18406b] mt-1">
          Exceptional Vibe
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value = 0, light = false }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${light ? "bg-gradient-to-r from-[#bfe8ff] to-[#7cc3ff]" : "bg-[#07234D]"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}


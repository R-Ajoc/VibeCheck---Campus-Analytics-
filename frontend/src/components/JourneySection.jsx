import React from 'react';
import { Globe2, LineChart, MessageSquare } from 'lucide-react';

const STEPS = [
  {
    title: 'Browse Resorts',
    description:
      'Access our global database of luxury resorts curated with verified guest data.',
    icon: Globe2,
    iconBg: '#004687',
  },
  {
    title: 'Read Vibe Insights',
    description:
      'Get AI-summarized insights that cut through the fluff to tell you exactly what to expect.',
    icon: LineChart,
    iconBg: '#38BDF8',
  },
  {
    title: 'Leave Reviews',
    description:
      'Help the community by sharing your authentic experience and earning rewards.',
    icon: MessageSquare,
    iconBg: '#1F2937',
  },
];

export default function JourneySection() {
  return (
    <section className="w-full bg-[#F0F7FF] py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-center font-bold text-3xl tracking-tight text-[#0F172A] mb-16">
          Your Journey to the Perfect Stay
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: step.iconBg }}
                >
                  <Icon className="w-8 h-8 text-white" strokeWidth={1.8} />
                </div>

                <h3 className="text-xl font-bold mt-6 mb-3 text-[#0F172A]">{step.title}</h3>

                <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

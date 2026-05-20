import React from 'react';

/**
 * WaveBackground Component
 * 
 * A reusable, responsive wave SVG background with layered opacity.
 * Designed for the VibeCheck homepage with a calm, resort-themed aesthetic.
 * 
 * Props:
 * - height: string (default: "300px") - vertical size of wave section
 * - position: "top" | "bottom" (default: "bottom") - visual placement
 * - opacity: number (default: 0.08) - global opacity multiplier (0-1)
 * - animate: boolean (default: false) - enable subtle floating animation
 * - className: string - additional Tailwind classes
 */
export default function WaveBackground({
  height = '300px',
  position = 'bottom',
  opacity = 0.08,
  animate = false,
  className = '',
}) {
  // Clamp opacity between 0 and 1
  const safeOpacity = Math.min(Math.max(opacity, 0), 1);

  // Calculate opacity for each layer
  const layer1Opacity = safeOpacity * 0.5;      // 50% of base opacity
  const layer2Opacity = safeOpacity * 0.75;     // 75% of base opacity
  const layer3Opacity = safeOpacity;             // Full opacity

  // Brand color with opacity
  const brandColor = '#004687';

  return (
    <div
      className={`absolute w-full pointer-events-none ${position === 'bottom' ? 'bottom-0' : 'top-0'} ${className}`}
      style={{
        height,
      }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 300"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Define gradients for smooth fading */}
        <defs>
          <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={brandColor}
              stopOpacity={layer1Opacity}
            />
            <stop
              offset="100%"
              stopColor={brandColor}
              stopOpacity={layer1Opacity * 0.3}
            />
          </linearGradient>

          <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={brandColor}
              stopOpacity={layer2Opacity}
            />
            <stop
              offset="100%"
              stopColor={brandColor}
              stopOpacity={layer2Opacity * 0.3}
            />
          </linearGradient>

          <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={brandColor}
              stopOpacity={layer3Opacity}
            />
            <stop
              offset="100%"
              stopColor={brandColor}
              stopOpacity={layer3Opacity * 0.3}
            />
          </linearGradient>
        </defs>

        {/* Wave Layer 1 - Slow, gentle curves */}
        <path
          d={
            position === 'bottom'
              ? 'M 0 150 Q 300 100 600 150 T 1200 150 L 1200 300 L 0 300 Z'
              : 'M 0 150 Q 300 200 600 150 T 1200 150 L 1200 0 L 0 0 Z'
          }
          fill="url(#waveGradient1)"
          className={animate ? 'animate-wave-slow' : ''}
        />

        {/* Wave Layer 2 - Medium curves, offset */}
        <path
          d={
            position === 'bottom'
              ? 'M 0 120 Q 200 80 400 120 T 800 120 T 1200 120 L 1200 300 L 0 300 Z'
              : 'M 0 120 Q 200 160 400 120 T 800 120 T 1200 120 L 1200 0 L 0 0 Z'
          }
          fill="url(#waveGradient2)"
          className={animate ? 'animate-wave-medium' : ''}
        />

        {/* Wave Layer 3 - Tighter curves for detail */}
        <path
          d={
            position === 'bottom'
              ? 'M 0 100 Q 150 70 300 100 T 600 100 T 900 100 T 1200 100 L 1200 300 L 0 300 Z'
              : 'M 0 100 Q 150 130 300 100 T 600 100 T 900 100 T 1200 100 L 1200 0 L 0 0 Z'
          }
          fill="url(#waveGradient3)"
          className={animate ? 'animate-wave-fast' : ''}
        />
      </svg>

      {/* Subtle animation keyframes */}
      {animate && (
        <style>{`
          @keyframes wave-slow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          @keyframes wave-medium {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
          }
          @keyframes wave-fast {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-1px); }
          }
          .animate-wave-slow {
            animation: wave-slow 8s ease-in-out infinite;
          }
          .animate-wave-medium {
            animation: wave-medium 6s ease-in-out infinite;
          }
          .animate-wave-fast {
            animation: wave-fast 4s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
}
// Positive sentiment icon
export function PositiveIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* outer circle (thicker) */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="4"
      />

      {/* eyes (thicker + more visible) */}
      <circle cx="17" cy="20" r="2.2" strokeWidth="4" fill="currentColor" />
      <circle cx="31" cy="20" r="2.2" strokeWidth="4" fill="currentColor" />

      {/* smile (thicker arc) */}
      <path
        d="M16 28c2.5 4 5.5 6 8 6s5.5-2 8-6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* optional subtle cheeks / emphasis */}
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
    </svg>
  );
}

export function NeutralIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* outer circle */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="4"
      />

      {/* eyes */}
      <circle cx="17" cy="20" r="2.2" strokeWidth="4" fill="currentColor" />
      <circle cx="31" cy="20" r="2.2" strokeWidth="4" fill="currentColor" />

      {/* neutral mouth */}
      <line
        x1="16"
        y1="30"
        x2="32"
        y2="30"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* subtle inner guide circle (optional depth) */}
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="4"
      />
    </svg>
  );
}

// Negative sentiment icon
export function NegativeIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
    >
      {/* face circle */}
      <circle cx="12" cy="12" r="10" strokeWidth="2" />

      {/* eyes */}
      <circle cx="8.5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1.2" fill="currentColor" />

      {/* sad mouth */}
      <path
        d="M8 16c1.2-1 2.7-1.5 4-1.5s2.8.5 4 1.5"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* eyebrow left */}
      <path
        d="M7 8l2.5 1.8"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* eyebrow right */}
      <path
        d="M17 8l-2.5 1.8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
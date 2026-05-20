function Bubbles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <svg
        className="absolute top-0 left-0 w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="180" cy="140" r="90" fill="#004687" fillOpacity="0.05" />
        <circle cx="420" cy="260" r="45" fill="#38BDF8" fillOpacity="0.07" />
        <circle cx="1220" cy="180" r="110" fill="#004687" fillOpacity="0.04" />
        <circle cx="1100" cy="520" r="70" fill="#0EA5E9" fillOpacity="0.06" />
        <circle cx="250" cy="700" r="130" fill="#004687" fillOpacity="0.03" />
        <circle cx="760" cy="620" r="55" fill="#38BDF8" fillOpacity="0.05" />
        <circle cx="1340" cy="760" r="85" fill="#004687" fillOpacity="0.04" />
        <circle cx="680" cy="120" r="35" fill="#7DD3FC" fillOpacity="0.08" />
      </svg>
    </div>
  );
}

export default Bubbles;
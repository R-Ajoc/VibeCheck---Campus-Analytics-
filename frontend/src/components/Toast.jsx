import { useEffect } from "react";

function Toast({ message, type = "error", onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === "error" ? "bg-red-500" : "bg-green-500";
  const icon = type === "error" ? "✕" : "✓";

  return (
    <div
      className={`fixed top-6 right-6 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slideIn z-50 max-w-md`}
    >
      <span className="text-xl font-bold">{icon}</span>
      <span className="text-sm">{message}</span>
    </div>
  );
}

export default Toast;

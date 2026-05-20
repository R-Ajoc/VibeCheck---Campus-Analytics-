import { useNavigate } from "react-router-dom";
import WaveBackground from "../components/WaveBackground";
import { AlertTriangle } from "lucide-react";

export default function ServerError() {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* SVG Wave Background */}
      <WaveBackground opacity={0.1} />

      {/* Content Container */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
          </div>

          {/* 500 Text */}
          <h1 className="text-8xl sm:text-9xl font-bold text-gray-200 mb-2">
            500
          </h1>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Server Error
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Something went wrong on our end. Our team has been notified and is working to fix the issue. Please try again in a moment.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleRefresh}
              className="px-8 py-3 bg-[#004687] cursor-pointer text-white font-semibold rounded-lg hover:shadow-lg transition-shadow duration-200"
            >
              Refresh Page
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 border-2 cursor-pointer border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition-colors duration-200"
            >
              Back to Home
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-gray-600 mb-6">In the meantime, you can:</p>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => navigate("/")}
                className="cursor-pointer text-center p-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="font-semibold text-gray-900 mb-1">Home</p>
                <p className="text-sm text-gray-600">Return to homepage</p>
              </button>
            </div>
          </div>

          {/* Support Message */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              If the problem persists, please contact our support team at{" "}
              <span className="font-semibold">support@vibecheck.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

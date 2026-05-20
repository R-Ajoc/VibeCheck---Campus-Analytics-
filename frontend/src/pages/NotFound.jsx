import { useNavigate } from "react-router-dom";
import WaveBackground from "../components/WaveBackground";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../components/auth/AuthContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* SVG Wave Background */}
      <WaveBackground opacity={0.1} />

      {/* Content Container */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl text-center">
          {/* Icon */}
        

          {/* 404 Text */}
          <h1 className="text-8xl sm:text-9xl font-bold text-gray-200 mb-2">
            404
          </h1>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-[#004687] cursor-pointer text-white font-semibold rounded-lg hover:shadow-lg transition-shadow duration-200"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-3 border-2 cursor-pointer border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition-colors duration-200"
            >
              Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-gray-600 mb-6">Looking for something specific?</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <button
                onClick={() => navigate("/")}
                className="cursor-pointer text-center p-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="font-semibold text-gray-900 mb-1">Home</p>
                <p className="text-sm text-gray-600">Return to homepage</p>
              </button>
              {!user && (
                <button
                  onClick={() => navigate("/login")}
                  className="cursor-pointer text-center p-4 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <p className="font-semibold text-gray-900 mb-1">Sign In</p>
                  <p className="text-sm text-gray-600">Log into your account</p>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

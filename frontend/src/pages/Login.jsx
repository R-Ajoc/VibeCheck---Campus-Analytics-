import { useNavigate } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";
import WaveBackground from "../components/WaveBackground";
import { login } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async (username, password) => {
    const data = await login(username, password);

    // store token
    localStorage.setItem("token", data.access_token);
    
    // store user data if available
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    // dispatch login event to trigger navbar re-render
    window.dispatchEvent(new CustomEvent('login'));

    // redirect after login

    if (data.user?.role === "admin" || data.user?.role === "superadmin") {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* SVG Wave Background - Fixed at bottom */}
      <WaveBackground />

      {/* Content Container */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
          {/* LEFT: Login Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <LoginForm onSubmit={handleLogin} />
            </div>
          </div>

          {/* RIGHT: Promotional Card */}
          <div className="hidden md:flex items-center justify-center">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg p-8 w-full flex flex-col justify-between shadow-xl h-[420px]">
              <div>
                <h3 className="text-3xl font-bold mb-4">Admin control center</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  Sign in to manage confession ingestion, monitor analytics, and keep your dataset up to date from one secure interface.
                </p>
              </div>
              <button className="w-full border-2 border-white text-white px-6 py-3 rounded hover:bg-white hover:text-gray-900 transition font-medium font-semibold mt-8">
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
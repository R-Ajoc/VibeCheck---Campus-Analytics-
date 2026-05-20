import RegisterForm from "../components/auth/RegisterForm";
import WaveBackground from "../components/WaveBackground";
import { useNavigate } from "react-router-dom";
import { register } from "../services/auth";

export default function Register() {
  const navigate = useNavigate();

  const handleRegister = async (data) => {
    try {
      await register(data);
      navigate("/login");
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* SVG Wave Background - Fixed at bottom */}
      <WaveBackground />

      {/* Content Container */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
          {/* LEFT: Register Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <RegisterForm onSubmit={handleRegister} />
            </div>
          </div>

          {/* RIGHT: Promotional Card */}
          <div className="hidden md:flex items-center justify-center">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg p-8 w-full flex flex-col justify-between shadow-xl h-[420px]">
              <div>
                <h3 className="text-3xl font-bold mb-4">Admin access only</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  Register a new admin account to manage confession import pipelines and review analytics in a secure, central dashboard.
                </p>
              </div>
              <button className="w-full border-2 border-white text-white px-6 py-3 rounded hover:bg-white hover:text-gray-900 transition font-medium font-semibold mt-8">
                Manage Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
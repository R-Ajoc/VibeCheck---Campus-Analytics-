import { useNavigate } from "react-router-dom";
import OwnerRegisterForm from "../components/auth/OwnerRegisterForm";
import WaveBackground from "../components/WaveBackground";
import { registerOwner } from "../services/auth";

export default function OwnerRegister() {
  const navigate = useNavigate();

  const handleOwnerRegister = async (payload) => {
    await registerOwner(payload);
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <WaveBackground />
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          <OwnerRegisterForm onSubmit={handleOwnerRegister} />
        </div>
      </div>
    </div>
  );
}

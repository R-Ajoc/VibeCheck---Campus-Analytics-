import { useNavigate } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";
import WaveBackground from "../components/WaveBackground";
import { login } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async (username, password) => {
    const data = await login(username, password);

    localStorage.setItem("token", data.access_token);

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    window.dispatchEvent(new CustomEvent('login'));

    if (data.user?.role === "admin" || data.user?.role === "superadmin") {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <WaveBackground
        height="420px"
        position="bottom"
        opacity={0.18}
        animate={true}
        className="pointer-events-none absolute inset-x-0 bottom-0"
      />
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <LoginForm onSubmit={handleLogin} />
        </div>
      </div>
    </div>
  );
}
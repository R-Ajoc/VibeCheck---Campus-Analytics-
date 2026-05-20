import { useState } from "react";
import Toast from "../Toast";
import Login from "../icons/Login";

function LoginForm({ onSubmit }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);
  const [invalidFields, setInvalidFields] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await onSubmit(username, password);
      setInvalidFields({});
    } catch (err) {
      let errorMessage = "Login failed";

      if (Array.isArray(err.response?.data?.detail)) {
        const errorDetail = err.response.data.detail[0];
        errorMessage = errorDetail?.msg || "Login failed";
        const fieldName = errorDetail?.loc?.[1] || "general";
        setInvalidFields({ [fieldName]: true });
      } else if (typeof err.response?.data?.detail === "string") {
        errorMessage = err.response.data.detail;
        setInvalidFields({ general: true });
      }

      setToast({ message: errorMessage, type: "error" });
    }
  };

  const clearFieldError = (fieldName) => {
    setInvalidFields((prev) => ({ ...prev, [fieldName]: false }));
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="text-center mb-8">
        <span className="inline-block bg-[#004687] text-blue-200 text-xs font-medium tracking-widest uppercase px-3 py-1 rounded-full mb-4">
          Admin portal
        </span>
        <h1 className="text-3xl font-semibold text-white mb-2">Welcome back</h1>
        <p className="text-sm text-slate-500">
          Sign in to manage confessions and view analytics
        </p>
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Username
              </label>
              <input
                className={`w-full bg-white/[0.06] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
                  invalidFields.username
                    ? "border-red-500 ring-2 ring-red-500"
                    : "border-white/10"
                }`}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onClick={() => clearFieldError("username")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Password
              </label>
              <input
                className={`w-full bg-white/[0.06] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
                  invalidFields.password
                    ? "border-red-500 ring-2 ring-red-500"
                    : "border-white/10"
                }`}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onClick={() => clearFieldError("password")}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                <input type="checkbox" className="accent-[#004687]" />
                Remember me
              </label>
              <a href="#" className="text-sm text-blue-400 hover:underline font-medium">
                Forgot password?
              </a>
            </div>
          </div>

          <button
            className="w-full bg-white hover:bg-slate-100 text-slate-950 font-semibold py-3 px-4 rounded-full mt-8 transition duration-200 flex items-center justify-center gap-2"
            type="submit"
          >
            <Login className="w-5 h-5" />
            Sign in
          </button>
        </form>
      </div>

      <p className="text-center mt-6 text-xs text-slate-600">
        VibeCheck · Campus Analytics Platform
      </p>
    </>
  );
}

export default LoginForm;
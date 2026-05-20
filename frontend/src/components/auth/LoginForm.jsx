import { useState } from "react";
import { Link } from "react-router-dom";
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
      
      // Handle validation errors (array of objects)
      if (Array.isArray(err.response?.data?.detail)) {
        const errorDetail = err.response.data.detail[0];
        errorMessage = errorDetail?.msg || "Login failed";
        
        // Mark the field as invalid
        const fieldName = errorDetail?.loc?.[1] || "general";
        setInvalidFields({ [fieldName]: true });
      }
      // Handle string error messages
      else if (typeof err.response?.data?.detail === "string") {
        errorMessage = err.response.data.detail;
        setInvalidFields({ general: true });
      }
      
      setToast({ message: errorMessage, type: "error" });
    }
  };

  const clearFieldError = (fieldName) => {
    setInvalidFields((prev) => ({
      ...prev,
      [fieldName]: false,
    }));
  };

  return (
    <>
      {/* // Display toast notifications for success or error messages */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">Admin Sign In</h2>
        <p className="text-gray-600 text-sm leading-relaxed">Log in to manage confession ingestion and view analytics.</p>
      </div>


      <div className="space-y-5">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
          <input
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
              invalidFields.username ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onClick={() => clearFieldError("username")}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
          <input
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
              invalidFields.password ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
            }`}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onClick={() => clearFieldError("password")}
            required
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center">
            <input type="checkbox" className="rounded" />
            <span className="ml-2 text-gray-700">Remember me</span>
          </label>
          <a href="#" className="text-[#004687] hover:underline font-medium">Forgot password?</a>
        </div>
      </div>

      <button
        className="w-full bg-[#004687] hover:bg-[#003560] text-white font-bold py-3 px-4 rounded mt-8 transition duration-200 flex items-center justify-center gap-2"
        type="submit"
      >
        <Login className="w-5 h-5" />
        Sign In
      </button>

    </form>
    </>
  );
}

export default LoginForm;
import { useState } from "react";
import { Link } from "react-router-dom";
import Toast from "../Toast";
import Services from "../icons/Register";

function RegisterForm({ onSubmit }) {
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState(null);
  const [invalidFields, setInvalidFields] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setInvalidFields({ confirmPassword: true });
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }

    try {
      await onSubmit({
        username,
        firstname: firstname || null,
        lastname: lastname || null,
        role: "admin",
        password,
      });
      setInvalidFields({});
    } catch (err) {
      const errorDetail = err.response?.data?.detail?.[0];
      const errorMessage = errorDetail?.msg || "Registration failed";
      
      // Mark the field as invalid
      const fieldName = errorDetail?.loc?.[1] || "general";
      setInvalidFields({ [fieldName]: true });
      
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">Create Admin Account</h2>
        <p className="text-gray-600 text-sm leading-relaxed">Register an admin account to manage confession ingestion and analytics.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
          <input
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
              invalidFields.username ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
            }`}
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onClick={() => clearFieldError("username")}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">First Name</label>
            <input
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
                invalidFields.firstname ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
              }`}
              placeholder="First name"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              onClick={() => clearFieldError("firstname")}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Last Name</label>
            <input
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
                invalidFields.lastname ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
              }`}
              placeholder="Last name"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              onClick={() => clearFieldError("lastname")}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
          <input
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
              invalidFields.password ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
            }`}
            type="password"
            placeholder="Create a password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onClick={() => clearFieldError("password")}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">Confirm Password</label>
          <input
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
              invalidFields.confirmPassword ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
            }`}
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onClick={() => clearFieldError("confirmPassword")}
            required
          />
        </div>

        <label className="flex items-start">
          <input type="checkbox" className="mt-1" required />
          <span className="ml-2 text-gray-600 text-sm">I agree to the Terms of Service and Privacy Policy</span>
        </label>
      </div>

      <button
        className="w-full bg-[#004687] hover:bg-[#003560] text-white font-bold py-3 px-4 rounded mt-8 transition duration-200 flex items-center justify-center gap-2"
        type="submit"
      >
        <Services className="w-5 h-5" />
        Create Admin
      </button>

      <p className="text-center text-gray-600 text-sm mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-[#004687] hover:underline font-bold">
          Sign In
        </Link>
      </p>
    </form>
    </>
  );
}

export default RegisterForm;
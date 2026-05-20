import { useState } from "react";
import Toast from "../Toast";

export default function OwnerRegisterForm({ onSubmit }) {
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [toast, setToast] = useState(null);
  const [invalidFields, setInvalidFields] = useState({});

  const inputClassName = (fieldName) =>
    `w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition ${
      invalidFields[fieldName] ? "border-red-500 ring-2 ring-red-500" : "border-gray-300"
    }`;

  const clearFieldError = (fieldName) => {
    setInvalidFields((prev) => ({
      ...prev,
      [fieldName]: false,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setInvalidFields({ confirmPassword: true });
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }

    const payload = new FormData();
    payload.append("username", username);
    payload.append("firstname", firstname || "");
    payload.append("lastname", lastname || "");
    payload.append("password", password);
    payload.append("business_name", businessName);
    payload.append("location", location);
    payload.append("short_description", shortDescription);
    if (image) {
      payload.append("image", image);
    }

    try {
      if (onSubmit) {
        await onSubmit(payload);
        setInvalidFields({});
      } else {
        setToast({ message: "Owner registration not yet implemented.", type: "info" });
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail?.[0];
      const errorMessage = errorDetail?.msg || "Registration failed";
      const fieldName = errorDetail?.loc?.[1] || "general";
      setInvalidFields({ [fieldName]: true });
      setToast({ message: errorMessage, type: "error" });
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <form onSubmit={handleSubmit} className="w-full" noValidate>
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Register Your Resort</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Set up an owner account and add your property details in one step.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Owner Details</h3>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
                <input
                  className={inputClassName("username")}
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
                    className={inputClassName("firstname")}
                    placeholder="First name"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    onClick={() => clearFieldError("firstname")}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Last Name</label>
                  <input
                    className={inputClassName("lastname")}
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
                  type="password"
                  className={inputClassName("password")}
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
                  type="password"
                  className={inputClassName("confirmPassword")}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onClick={() => clearFieldError("confirmPassword")}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Business Details</h3>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Business Name</label>
                <input
                  className={inputClassName("businessName")}
                  placeholder="Resort or property name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onClick={() => clearFieldError("businessName")}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Location</label>
                <input
                  className={inputClassName("location")}
                  placeholder="City, country"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onClick={() => clearFieldError("location")}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Short Description</label>
                <textarea
                  className={inputClassName("shortDescription")}
                  placeholder="Briefly describe your property"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  onClick={() => clearFieldError("shortDescription")}
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Business Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-[#004687] transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#f0f7ff] file:text-[#004687] hover:file:bg-[#e0eaff]"
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-4 h-40 w-full rounded-md object-cover border"
                    />
                  ) : (
                    <p className="mt-3 text-xs text-gray-500">Upload a cover photo for your listing.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start">
            <input type="checkbox" className="mt-1" required />
            <span className="ml-2 text-gray-600 text-sm">
              I agree to the Terms of Service and Privacy Policy
            </span>
          </div>

          <button
            className="w-full bg-[#004687] hover:bg-[#003560] text-white font-bold py-3 px-4 rounded mt-8 transition duration-200"
            type="submit"
          >
            Register Business
          </button>
        </div>
      </form>
    </>
  );
}

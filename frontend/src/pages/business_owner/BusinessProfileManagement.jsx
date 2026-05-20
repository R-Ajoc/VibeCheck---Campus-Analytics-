import { useEffect, useState } from "react";
import { BASE_URL, getDashboard, updateBusinessProfile } from "../../services/api";
import Toast from "../../components/Toast";

function BusinessProfileManagement() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [form, setForm] = useState({
        name: "",
        location: "",
        short_description: "",
        image_path: "",
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const dashboardData = await getDashboard();
                const profile = dashboardData.profile;
                setForm({
                    name: profile?.name || "",
                    location: profile?.location || "",
                    short_description: profile?.short_description || "",
                    image_path: profile?.image_path || "",
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Ensure profile management page starts at top when opened
    useEffect(() => {
        try {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch (e) {
            // noop in server/non-browser env
        }
    }, []);

    useEffect(() => {
        if (selectedImage) {
            const previewUrl = URL.createObjectURL(selectedImage);
            setImagePreview(previewUrl);

            return () => URL.revokeObjectURL(previewUrl);
        }

        if (!form.image_path) {
            setImagePreview("");
            return;
        }

        if (form.image_path.startsWith("http://") || form.image_path.startsWith("https://")) {
            setImagePreview(form.image_path);
            return;
        }

        setImagePreview(`${BASE_URL}${form.image_path}`);
    }, [form.image_path, selectedImage]);

    const handleChange = (field) => (event) => {
        const value = event.target.value;

        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));

        if (field === "image_path") {
            setSelectedImage(null);
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedImage(file);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setToast(null);

            const payload = new FormData();
            payload.append("name", form.name);
            payload.append("location", form.location);
            payload.append("short_description", form.short_description);

            if (form.image_path && !selectedImage) {
                payload.append("image_path", form.image_path);
            }

            if (selectedImage) {
                payload.append("image", selectedImage);
            }

            const updatedBusiness = await updateBusinessProfile(payload);
            
            console.log("Backend response:", updatedBusiness);
            console.log("Image path returned:", updatedBusiness?.image_path);
            
            setForm({
                name: updatedBusiness?.name || "",
                location: updatedBusiness?.location || "",
                short_description: updatedBusiness?.short_description || "",
                image_path: updatedBusiness?.image_path || "",
            });
            setSelectedImage(null);
            setToast({ message: "Business profile updated successfully.", type: "success" });
        } catch (err) {
            const errorMessage =
                err.response?.data?.detail || err.message || "Unable to update profile.";
            console.error("Error updating profile:", err);
            setToast({ message: errorMessage, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004687] mx-auto mb-4" />
                    <p className="text-gray-600">Loading profile management...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600">Error: {error}</div>;
    }

    return (
        <div className="px-6 py-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-6">
          

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Your Business Details</h2>
                            <p className="text-sm text-gray-500 mt-1">Keep your profile current and consistent.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6">
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt={form.name || "Business preview"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-center px-6">
                                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xl font-semibold">
                                                {form.name?.charAt(0)?.toUpperCase() || "B"}
                                            </div>
                                            <p className="text-sm font-medium text-gray-700">No image preview available</p>
                                            <p className="text-xs text-gray-500 mt-1">Upload a file or paste an image URL to preview it here.</p>
                                        </div>
                                    )}
                                </div>

                                <label className="mt-4 block">
                                    <span className="block text-sm font-medium text-gray-700 mb-2">Upload business image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-[#004687] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#00386d]"
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Image URL</label>
                                <input
                                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition border-gray-300"
                                    placeholder="https://... or /uploads/..."
                                    value={form.image_path}
                                    onChange={handleChange("image_path")}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Name</label>
                                <input
                                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition border-gray-300"
                                    placeholder="Business name"
                                    value={form.name}
                                    onChange={handleChange("name")}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Location</label>
                                <input
                                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition border-gray-300"
                                    placeholder="Business location"
                                    value={form.location}
                                    onChange={handleChange("location")}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Short Description</label>
                                <textarea
                                    className="w-full min-h-[140px] px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent transition border-gray-300 resize-none"
                                    placeholder="Tell customers what makes your business unique"
                                    value={form.short_description}
                                    onChange={handleChange("short_description")}
                                    required
                                    maxLength={255}
                                />
                                <p className="mt-2 text-xs text-gray-400">Max 255 characters.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded bg-[#004687] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003560] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BusinessProfileManagement;
import { X, PencilLine } from "lucide-react";

export default function ReviewEditModal({
  review,
  content,
  error,
  isSaving = false,
  onClose,
  onSubmit,
  onChange,
}) {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Review</h2>
            <p className="text-sm text-gray-500 mt-1">Update your review using the same layout as the submit form.</p>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>

            <textarea
              value={content}
              onChange={onChange}
              rows={6}
              required
              placeholder="Tell us about your experience..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-[#004687] text-white hover:bg-[#00386d] transition font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <PencilLine className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
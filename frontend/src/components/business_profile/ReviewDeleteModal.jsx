import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ReviewDeleteModal({
  review,
  isDeleting = false,
  onClose,
  onConfirm,
}) {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delete Review</h2>
            <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 leading-relaxed">
              Are you sure you want to delete this review? The review will be removed from the page and cannot be restored.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              {review.user?.lastname}, {review.user?.firstname}
            </p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-4">
              {review.content}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-6 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
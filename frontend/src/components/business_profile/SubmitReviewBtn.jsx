import { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from '../Toast';

export default function SubmitReviewButton({ businessId, onReviewCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toast, setToast] = useState(null);


  // Check if user is authenticated before allowing review submission
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!businessId) {
      setSubmitError('Business information is missing. Please reload and try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/reviews', {
        business_id: businessId,
        content: review.trim(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (onReviewCreated) {
        onReviewCreated(response.data);
      }

      setToast({ message: 'Review submitted successfully.', type: 'success' });

      setReview('');
      setIsOpen(false);
    } catch (err) {
      console.error('Error submitting review:', err);
      setSubmitError('Unable to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(true); setSubmitError(''); }}
        className="fixed bottom-8 right-8 z-50 bg-[#004687] hover:bg-[#00386d] text-white px-6 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2 font-medium"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Submit a Review
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Submit a Review
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Share your experience with other guests
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>

                <textarea
                  value={review}
                  onChange={(e) => { setReview(e.target.value); if (submitError) setSubmitError(''); }}
                  rows={6}
                  required
                  placeholder="Tell us about your experience..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent"
                />
              </div>

              {submitError && (
                <p className="text-sm text-rose-600">{submitError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-[#004687] text-white hover:bg-[#00386d] transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
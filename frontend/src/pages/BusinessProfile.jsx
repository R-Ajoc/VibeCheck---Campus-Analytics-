import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import getVibeLevelFromScore from '../utils/vibeLabel';
import WaveBackground from '../components/WaveBackground';
import ProfileSidebar from '../components/business_profile/ProfileSidebar';
import ProfileContent from '../components/business_profile/ProfileContent';
import SubmitReviewButton from '../components/business_profile/SubmitReviewBtn';
import ReviewEditModal from '../components/business_profile/ReviewEditModal';
import ReviewDeleteModal from '../components/business_profile/ReviewDeleteModal';
import Toast from '../components/Toast';
import { deleteReview, updateReview } from '../services/api';

export default function BusinessProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  const handleReviewCreated = (newReview) => {
    setReviews((prevReviews) => [newReview, ...prevReviews]);
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setEditContent(review?.content || '');
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingReview(null);
    setEditContent('');
    setEditError('');
  };

  const openDeleteModal = (review) => {
    setDeletingReview(review);
  };

  const closeDeleteModal = () => {
    setDeletingReview(null);
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();

    if (!editingReview) return;

    const nextContent = editContent.trim();
    if (!nextContent) {
      setEditError('Please enter a review message.');
      return;
    }

    try {
      setIsSavingReview(true);
      setEditError('');

      const updated = await updateReview(editingReview.id, { content: nextContent });

      setReviews((prevReviews) =>
        prevReviews.map((review) => (review.id === updated.id ? updated : review))
      );

      setToast({ type: 'success', message: 'Review updated successfully.' });
      closeEditModal();
    } catch (err) {
      setEditError(err?.response?.data?.detail || 'Unable to update review. Please try again.');
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReview) return;

    try {
      setIsDeletingReview(true);
      await deleteReview(deletingReview.id);

      setReviews((prevReviews) => prevReviews.filter((review) => review.id !== deletingReview.id));
      setToast({ type: 'success', message: 'Review deleted successfully.' });
      closeDeleteModal();
    } catch (err) {
      setToast({ type: 'error', message: 'Unable to delete review. Please try again.' });
    } finally {
      setIsDeletingReview(false);
    }
  };

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setIsLoading(true);

        const response = await axios.get(`/api/businesses/${id}/profile`);
        const businessData = response.data;

        setBusiness(businessData);
        setReviews(businessData.reviews || []);
        setError(null);
      } catch (err) {
        setError('Failed to load resort details');
        console.error('Error fetching business data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchBusinessData();
    }
  }, [id]);

  // Prevent background scrolling while inside profile page
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004687] mx-auto mb-4" />
          <p className="text-gray-600">Loading resort details...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Resort not found'}
          </h2>

          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-[#004687] text-white rounded-lg hover:bg-blue-800 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const latestVibe = business.latest_vibe || {};

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 relative overflow-hidden">
      <WaveBackground />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
        title="Go back"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-[#004687]" />
      </button>

      <div className="relative z-10 h-[calc(100vh-64px)] flex">
        <ProfileSidebar
          business={business}
          latestVibe={latestVibe}
          getVibeLevelFromScore={getVibeLevelFromScore}
        />

        <ProfileContent
          reviews={reviews}
          latestVibe={latestVibe}
          onEditReview={openEditModal}
          onDeleteReview={openDeleteModal}
        />
      </div>

      <SubmitReviewButton
        businessId={business.id}
        onReviewCreated={handleReviewCreated}
      />

      <ReviewEditModal
        review={editingReview}
        content={editContent}
        error={editError}
        isSaving={isSavingReview}
        onClose={closeEditModal}
        onSubmit={handleUpdateReview}
        onChange={(e) => {
          setEditContent(e.target.value);
          if (editError) setEditError('');
        }}
      />

      <ReviewDeleteModal
        review={deletingReview}
        isDeleting={isDeletingReview}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteReview}
      />

    </div>
  );
}
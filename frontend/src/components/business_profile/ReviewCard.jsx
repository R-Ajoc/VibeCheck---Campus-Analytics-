import AspectSentimentChip from "../AspectSentimentChip";
import { useAuth } from "../auth/AuthContext";
import formatRelativeTime from "../../utils/formatRelativeTime";
import { PencilLine, Trash2, UserCheck } from "lucide-react";

export default function ReviewCard({
  review,
  compact = false,
  onEditReview,
  onDeleteReview,
  hideOwnerActions = false,
}) {
  const { user: currentUser } = useAuth();

  const getInitials = (firstname, lastname) => {
    return `${(firstname?.[0] || "").toUpperCase()}${(lastname?.[0] || "").toUpperCase()}`;
  };

  const aspectSentiments = review.aspect_sentiments || [];
  const currentUserId = currentUser?.id != null ? String(currentUser.id) : null;
  const reviewOwnerId =
    review?.user_id != null
      ? String(review.user_id)
      : review?.user?.id != null
        ? String(review.user.id)
        : null;
  const isOwnReview = Boolean(currentUserId && reviewOwnerId && currentUserId === reviewOwnerId);

  return (
    <div
      className={[
        "bg-white border border-gray-200 rounded-lg transition-shadow hover:shadow-sm",
        compact ? "p-4" : "p-6",
      ].join(" ")}
    >
      {/* HEADER */}
      <div className={`flex items-start justify-between ${compact ? "mb-2" : "mb-4"}`}>
        <div className={`flex items-start ${compact ? "gap-2" : "gap-4"}`}>
          {/* Avatar */}
          <div
            className={[
              "rounded-full bg-[#004687] flex items-center justify-center text-white font-semibold flex-shrink-0",
              compact ? "w-7 h-7 text-[10px]" : "w-12 h-12 text-sm",
            ].join(" ")}
          >
            {getInitials(review.user?.firstname, review.user?.lastname)}
          </div>

          {/* User */}
          <div className="leading-tight">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-semibold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>
                {review.user?.lastname}, {review.user?.firstname}
              </p>
              {!hideOwnerActions && isOwnReview && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#004687] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white shadow-sm shadow-blue-300/40">
                  <UserCheck className="w-3 h-3" />
                  Your review
                </span>
              )}
            </div>

            <p className={`text-gray-500 ${compact ? "text-[11px]" : "text-sm"}`}>
              {formatRelativeTime(review.created_at)}
            </p>
          </div>
        </div>

        {!hideOwnerActions && isOwnReview && (onEditReview || onDeleteReview) && (
          <div className="ml-3 flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditReview?.(review)}
              disabled={!onEditReview}
              className="inline-flex items-center justify-center rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#004687]"
              aria-label="Edit review"
              title="Edit review"
            >
              <PencilLine className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteReview?.(review)}
              disabled={!onDeleteReview}
              className="inline-flex items-center justify-center rounded-full p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Delete review"
              title="Delete review"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <p
        className={[
          "text-gray-700",
          compact ? "text-sm leading-snug mb-2" : "text-base leading-relaxed mb-4",
        ].join(" ")}
      >
        {review.content}
      </p>

      {/* ASPECTS */}
      {aspectSentiments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {aspectSentiments.map((aspect, index) => (
            <AspectSentimentChip
              key={index}
              aspect={aspect.aspect}
              sentiment={aspect.sentiment_label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
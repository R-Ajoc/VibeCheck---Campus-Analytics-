import { useEffect, useMemo, useRef, useState } from 'react';
import ReviewCard from './ReviewCard';
import VibeSummaryCard from './VibeSummaryCard';

const PROFILE_REVIEWS_PAGE_SIZE = 8;

function ProfileContent({ reviews, latestVibe, onEditReview, onDeleteReview }) {
  const reviewCount = reviews.length || 0;
    const [searchQuery, setSearchQuery] = useState('');
    const [aspectFilter, setAspectFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
        const [visibleCount, setVisibleCount] = useState(PROFILE_REVIEWS_PAGE_SIZE);
    const reviewScrollRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);

    const aspectOptions = useMemo(() => {
        const seen = new Set();
        const options = [];
        for (const review of reviews) {
            for (const aspect of review?.aspect_sentiments || []) {
                if (!aspect?.aspect || seen.has(aspect.aspect)) continue;
                seen.add(aspect.aspect);
                options.push(aspect.aspect);
            }
        }
        return options;
    }, [reviews]);

    const filteredReviews = useMemo(() => {
        let list = reviews || [];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((r) =>
                (r.content || '').toLowerCase().includes(q) ||
                (r.user?.firstname || '').toLowerCase().includes(q) ||
                (r.user?.lastname || '').toLowerCase().includes(q)
            );
        }

        if (aspectFilter) {
            list = list.filter((r) =>
                (r.aspect_sentiments || []).some((a) => a.aspect === aspectFilter)
            );
        }

        list = list.sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return sortOrder === 'newest' ? tb - ta : ta - tb;
        });

        return list;
    }, [reviews, searchQuery, aspectFilter, sortOrder]);

    useEffect(() => {
        setVisibleCount(PROFILE_REVIEWS_PAGE_SIZE);
    }, [searchQuery, aspectFilter, sortOrder, reviews]);

    const displayedReviews = useMemo(
        () => filteredReviews.slice(0, visibleCount),
        [filteredReviews, visibleCount]
    );

    const canLoadMore = visibleCount < filteredReviews.length;

    useEffect(() => {
        const root = reviewScrollRef.current;
        const sentinel = loadMoreSentinelRef.current;

        if (!root || !sentinel || !canLoadMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + PROFILE_REVIEWS_PAGE_SIZE, filteredReviews.length));
                }
            },
            {
                root,
                rootMargin: '0px 0px 180px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [canLoadMore, filteredReviews.length]);

  return (
    <main className="flex-1 flex flex-col overflow-hidden w-full h-full">

      {/* Fixed Summary */}

        <div className="flex-shrink-0 px-6 pt-6 pb-4 max-w-4xl w-full mx-auto">
          <VibeSummaryCard
            summary={latestVibe.summary_text}
            reviewCount={reviewCount}
          />
        </div>

    {/* Scrollable Reviews Container — no longer scrolls */}
    <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 pb-8 h-full flex flex-col">

            {/* White card — this is now the scrollable element */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden">

            {/* Header row — stays fixed at top of card */}
            <div className="flex-shrink-0 flex flex-col gap-3 px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                Guest Reviews ({reviewCount})
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reviews..."
                    className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004687]/20 focus:border-[#004687] transition"
                />

                {aspectOptions.length > 0 && (
                    <select
                    value={aspectFilter}
                    onChange={(e) => setAspectFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004687]/20 focus:border-[#004687] transition"
                    >
                    <option value="">All aspects</option>
                    {aspectOptions.map((aspect) => (
                        <option key={aspect} value={aspect}>
                        {aspect}
                        </option>
                    ))}
                    </select>
                )}

                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004687]/20 focus:border-[#004687] transition"
                >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                </select>

                {(searchQuery || aspectFilter) && (
                    <button
                    onClick={() => {
                        setSearchQuery('');
                        setAspectFilter('');
                        setSortOrder('newest');
                    }}
                    className="text-sm text-[#004687] font-medium hover:underline"
                    >
                    Clear
                    </button>
                )}
                </div>
            </div>

            {/* Reviews list — scrolls inside the card */}
            <div ref={reviewScrollRef} className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-gray-100">
                {filteredReviews.length === 0 ? (
                <div className="p-12 text-center">
                    {searchQuery ? (
                    <>
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">No results found</h3>
                        <p className="text-sm text-gray-500">No reviews match "{searchQuery}"</p>
                    </>
                    ) : (
                    <>
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                        <p className="text-gray-600">This resort doesn't have any reviews yet. Be the first to review!</p>
                    </>
                    )}
                </div>
                ) : (
                displayedReviews.map((review) => (
                    <div key={review.id} className="px-5 py-2">
                                        <ReviewCard
                                            review={review}
                                            onEditReview={onEditReview}
                                            onDeleteReview={onDeleteReview}
                                        />
                    </div>
                ))
                )}

                {canLoadMore && <div ref={loadMoreSentinelRef} className="h-2" aria-hidden="true" />}
            </div>

        </div>

        
    </div>
    </div>
    </main>
  );
}

export default ProfileContent;
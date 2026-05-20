import { useEffect, useMemo, useRef, useState } from "react";
import { getBusinessReviewsPage } from "../../services/api";
import ReviewCard from "../../components/business_profile/ReviewCard";
import {
  Search,
  Filter,
  ChevronDown,
  Smile,
  Frown,
} from "lucide-react";
import Loader from "../../components/Loader";

const PAGE_SIZE = 15;

// ─── Small helpers ────────────────────────────────────────────────────────────

function KeywordPill({ label, variant }) {
  const styles =
    variant === "positive"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
      : "bg-red-50 text-red-600 ring-1 ring-red-200/60";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${styles}`}
    >
      {label}
    </span>
  );
}

function SelectField({ value, onChange, children }) {
  return (
    <div className="relative w-full sm:w-auto">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#004687]/20 focus:border-[#004687] transition cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function BusinessReviews() {
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [query, setQuery] = useState("");
  const [aspectFilter, setAspectFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const scrollContainerRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);

  const fetchPage = async ({ offset, append, includeKeywords }) => {
    const pageData = await getBusinessReviewsPage({
      offset,
      limit: PAGE_SIZE,
      includeKeywords,
    });

    setBusiness((prev) => ({
      ...(prev || {}),
      business_id: pageData.business_id,
      review_count: pageData.review_count,
      positive_keywords:
        includeKeywords || !prev?.positive_keywords
          ? pageData.positive_keywords || []
          : prev.positive_keywords,
      negative_keywords:
        includeKeywords || !prev?.negative_keywords
          ? pageData.negative_keywords || []
          : prev.negative_keywords,
    }));

    setHasMore(Boolean(pageData.has_more));
    setReviews((prev) => (append ? [...prev, ...(pageData.reviews || [])] : pageData.reviews || []));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchPage({ offset: 0, append: false, includeKeywords: true });
      } catch (err) {
        setError(err.message || "Failed to load reviews page");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const positiveKeywords = useMemo(
    () =>
      (business?.positive_keywords || []).map((keyword) => ({
        term: keyword,
      })),
    [business]
  );

  const negativeKeywords = useMemo(
    () =>
      (business?.negative_keywords || []).map((keyword) => ({
        term: keyword,
      })),
    [business]
  );

  const filteredReviews = useMemo(() => {
    let list = reviews || [];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          (r.content || "").toLowerCase().includes(q) ||
          (r.user?.firstname || "").toLowerCase().includes(q) ||
          (r.user?.lastname || "").toLowerCase().includes(q)
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
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });

    return list;
  }, [reviews, query, aspectFilter, sortOrder]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      await fetchPage({
        offset: reviews.length,
        append: true,
        includeKeywords: false,
      });
    } catch (err) {
      setError(err.message || "Failed to load more reviews");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const root = scrollContainerRef.current;
    const sentinel = loadMoreSentinelRef.current;

    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          hasMore &&
          !loadingMore &&
          !query &&
          !aspectFilter
        ) {
          handleLoadMore();
        }
      },
      {
        root,
        rootMargin: "0px 0px 180px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, query, aspectFilter, reviews.length]);


  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader page={"Customer Reviews"} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // ── UI ──
  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] flex flex-col">
      <div className="flex-1 px-6 py-8 min-h-0">
        <div className="max-w-7xl mx-auto h-full min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 h-full min-h-0">

            {/* LEFT COLUMN: TITLE + KEYWORDS */}
            <div className="flex flex-col gap-4 min-h-0 h-full">
              
              {/* KEYWORDS (with title inside) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1">
                {/* TITLE SECTION */}
                <div className="p-5 flex-shrink-0">
                  <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
                  <p className="text-sm text-gray-400 mt-1">
                    {business?.review_count || 0} total reviews
                  </p>
                </div>

                {/* SEPARATOR */}
                <div className="h-px bg-gray-100 flex-shrink-0" />

                {/* KEYWORDS CONTENT */}
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Smile className="w-3 h-3 text-emerald-500" /> Positive
                    </p>
                    {positiveKeywords.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">
                        No positive keywords yet
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {positiveKeywords.map((k, i) => (
                          <KeywordPill key={i} label={k.term} variant="positive" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Frown className="w-3 h-3 text-red-500" /> Negative
                    </p>
                    {negativeKeywords.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">
                        No negative keywords yet
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {negativeKeywords.map((k, i) => (
                          <KeywordPill key={i} label={k.term} variant="negative" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: SEARCH + REVIEWS */}
            <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">

              {/* SEARCH + INLINE FILTERS */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col sm:flex-row sm:items-center gap-3 flex-shrink-0">

                {/* SEARCH */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search reviews…"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004687]/20"
                  />
                </div>

                {/* FILTERS INLINE */}
                <div className="flex items-center gap-2 flex-shrink-0">

                  {/* Aspect */}
                  {aspectOptions.length > 0 && (
                    <SelectField
                      value={aspectFilter}
                      onChange={(e) => setAspectFilter(e.target.value)}
                    >
                      <option value="">All aspects</option>
                      {aspectOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </SelectField>
                  )}

                  {/* SORT */}
                  <SelectField
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </SelectField>

                  {(query || aspectFilter) && (
                    <button
                      onClick={() => {
                        setQuery("");
                        setAspectFilter("");
                        setSortOrder("newest");
                      }}
                      className="text-xs text-[#004687] font-medium hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* RESULTS - SCROLLABLE */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
                {filteredReviews.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Filter className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No reviews found</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredReviews.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm"
                      >
                        <ReviewCard review={r} hideOwnerActions />
                      </div>
                    ))}

                    {!query && !aspectFilter && hasMore && (
                      <div ref={loadMoreSentinelRef} className="h-2" aria-hidden="true" />
                    )}

                    {loadingMore && (
                      <div className="py-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#004687]" />
                        Loading more reviews...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessReviews;
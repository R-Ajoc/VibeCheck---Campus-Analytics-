import { getDashboard } from "../../services/api";
import { useEffect, useState } from "react";
import MetricCard from "../../components/dashboard/MetricCard";
import VibeChart from "../../components/dashboard/VibeChart";
import PeakDropAnalysisCard from "../../components/dashboard/PeakDropAnalysisCard";
import ReviewEventDetectionCard from "../../components/dashboard/ReviewEventDetectionCard";
import AspectMentionShareChart from "../../components/dashboard/AspectMentionShareChart";
import { Link } from "react-router-dom";
import ReviewVolumeChart from "../../components/dashboard/ReviewVolumeChart";
import SentimentPieChart from "../../components/dashboard/SentimentPieChart";
import VibeForecastChart from "../../components/dashboard/VibeForecastChart";
import ReviewCard from "../../components/business_profile/ReviewCard";
import HealthGauge from "../../components/dashboard/HealthGauge";
import { MessageSquare } from "lucide-react";

/* ===========================
   DASHBOARD
=========================== */
function BusinessDashboard() {
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const dashboardData = await getDashboard();
                setBusiness(dashboardData);
            } catch (err) {
                setError(err.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Ensure the dashboard starts scrolled to top when navigated to
    useEffect(() => {
        try {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch (e) {
            // no-op in non-browser environments
        }
    }, []);

      if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004687] mx-auto mb-4" />
                    <p className="text-gray-600">Loading business dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    /* ===========================
       SAFE DEFAULTS
    =========================== */
    const vibe = business?.vibe || {};
    const vibe_ui = business?.vibe_ui || { type: "new", ui_label: "New" };
    const vibeChart = business?.vibe_chart || {};
    const aspects = business?.aspects || [];
    const business_health = business?.business_health || {};
    const review_activity = business?.review_activity || {};

    const reviewVolumeOverTime = business?.review_volume_over_time || {};
    const forecastSentiment =
        business?.forecast_vibe || business?.forecast_sentiment || {};

    const sentimentDistribution = business?.sentiment_distribution || {};
    const vibeTrend = business?.vibe_score_trend || {};

    const trendValue =
        vibeTrend.slope != null ? vibeTrend.slope.toFixed(2) : null;

    /* ===========================
       SUBTITLE LOGIC
    =========================== */
    const vibeMinRequired = vibeTrend?.meta?.min_required ?? 7;

    let vibeSubtitle = "";

    if (business.review_count < vibeMinRequired) {
        vibeSubtitle = "Not enough reviews yet";
    } else if (vibe?.status === "no_data" || vibe?.vibe_score == null) {
        vibeSubtitle = "Processing vibe analysis...";
    } else {
        vibeSubtitle = `${vibe.reviews_analyzed || 0} reviews analyzed`;
    }

    /* ===========================
       REVIEW ACTIVITY CARD
    =========================== */

     // Top aspect insight
     const aspectFreq = business?.aspect_frequency?.aspects || [];
     const sortedAspects = [...aspectFreq].sort((a, b) => (b.count || 0) - (a.count || 0));
     const topAspect = sortedAspects[0] || null;
     const topAspectName = topAspect ? topAspect.term.charAt(0).toUpperCase() + topAspect.term.slice(1) : null;


    return (
        <div className="px-6 py-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* TOP GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">

                    <div className="space-y-4">

                        {/* METRIC CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                label="Vibe Score"
                                value={vibe.vibe_score?.toFixed(1) ?? "--"}
                                subtitle={vibeSubtitle}
                                badge={{
                                    type: vibe_ui.type,
                                    label: vibe_ui.ui_label
                                }}
                                trend={vibeTrend?.trend ? { direction: vibeTrend.trend } : null}
                                vibeStatus={vibe?.status}
                            />

                            <MetricCard
                                label="Total Reviews"
                                value={business.review_count || 0}
                                showTrend={false}
                                subtitle="All-time collected feedback"
                            />

                            <MetricCard
                                label="Top Performing Aspect"
                                value={
                                    (business?.positive_drivers?.driver || "--")
                                        .toString()
                                        .replace(/_/g, " ")
                                        .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
                                }
                                subtitle="Top-performing area based on recent customer reviews"
                                showTrend={false}
                            />

                        </div>

                        <ReviewEventDetectionCard data={review_activity} />
         
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                            <VibeChart
                                data={vibeChart}
                                vibeOverTime={business?.vibe_score_daily || {}}
                                peakAndDrop={business?.peak_and_drop || {}}
                                embedded
                                headerRight={
                                    <PeakDropAnalysisCard
                                        data={business?.peak_and_drop || {}}
                                        embedded
                                    />
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <HealthGauge data={business_health} />

                        <AspectMentionShareChart
                            data={business?.aspect_frequency || {}}
                            title={"What Customers Talk About"}
                            subtitle={"Top aspects mentioned in recent reviews"}
                            topAspectName={topAspectName}
                            topAspect={topAspect}
                        />
                    </div>
                </div>

                {/* REVIEW VOLUME SECTION */}
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="w-full xl:w-[35%]">
                        <SentimentPieChart
                            distribution={sentimentDistribution}
                        />
                    </div>

                    <div className="w-full xl:w-[65%]">
                        <ReviewVolumeChart
                            data={reviewVolumeOverTime}
                        />
                    </div>
                </div>

                {/* FORECAST + REVIEWS */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                    <VibeForecastChart data={forecastSentiment} />

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[480px] flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-gray-700" />
                                <h3 className="text-lg font-semibold">
                                    Latest Reviews
                                </h3>
                            </div>

                            <Link
                                to="/business/reviews"
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#004687] border border-[#004687]/30 rounded-md hover:bg-[#004687]/5"
                            >
                                View more reviews
                            </Link>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="flex flex-col gap-4">
                                {(business?.latest_reviews || []).map((r) => (
                                <ReviewCard key={r.id} review={r} compact />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default BusinessDashboard;
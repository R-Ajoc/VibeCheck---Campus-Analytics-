import { useEffect, useState } from "react";
import { getAnalytics } from "../../services/api";

import HealthDiagnostic from "../../components/analytics/HealthDiagnostic";
import ExecutiveSummary from "../../components/analytics/ExecutiveSummary";
import PrimaryRiskDriver from "../../components/dashboard/PrimaryRiskDriver";
import NegativeSignals from "../../components/dashboard/NegativeSignals";
import PositiveDrivers from "../../components/dashboard/PositiveDrivers";
import FrequentAspectAnalysis from "../../components/dashboard/FrequentAspectAnalysis";
import AspectAnalytics from "../../components/dashboard/AspectAnalytics";
import VibeHeatmap from "../../components/dashboard/VibeHeatmap";

function BusinessAnalytics() {
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const analyticsData = await getAnalytics();
                setBusiness(analyticsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Ensure analytics page scrolls to top on mount
    useEffect(() => {
        try {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch (e) {
            // noop for non-browser environments
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004687] mx-auto mb-4" />
                    <p className="text-gray-600">Loading business analytics...</p>
                </div>
            </div>
        );
    }

    if (error) return <div>Error: {error}</div>;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

            {/* Executive Summary */}
            <ExecutiveSummary dashboard={business || {}} loading={loading} />

            {/* TOP ANALYTICS ROW */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <FrequentAspectAnalysis data={business?.aspect_frequency || {}} />

                <VibeHeatmap
                    data={business?.vibe_score_daily || {}}
                    vibeOverTime={business?.vibe_score_daily || {}}
                    embedded
                />
            </div>

            {/* CORE INSIGHTS */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">

                <AspectAnalytics
                    aspects={business?.aspects || []}
                    onViewAll={() => {}}
                    compact={false}
                />

                <div className="flex flex-col gap-6">

                    <PrimaryRiskDriver data={business?.primary_risk_driver || {}} />

                    <PositiveDrivers data={business?.positive_drivers || {}} />

                </div>
            </div>

            {/* DIAGNOSIS LAYER (FIXED) */}
           <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">

                <NegativeSignals data={business?.negative_signals || {}} />

                <HealthDiagnostic data={business?.business_health || {}} />

            </div>

        </div>
    );
}

export default BusinessAnalytics;
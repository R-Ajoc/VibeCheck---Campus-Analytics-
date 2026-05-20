import { useEffect, useState } from "react";
import axios from "axios";
import { Bed, Heart, MessageSquare, Smile } from "lucide-react";
import VibeDiscoverySection from "../components/VibeDiscoverySection";
import CuratedForYouSection from "../components/CuratedForYouSection";
import WaveBackground from "../components/WaveBackground";
function ResortsDiscovery() {
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [vibeDataMap, setVibeDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const discoveryStats = (() => {
    if (!businesses.length) {
      return [];
    }

    const totalBusinesses = businesses.length;
    const totalReviews = businesses.reduce((sum, business) => sum + (business.reviews_count || business.review_count || 0), 0);

    const scores = Object.values(vibeDataMap)
      .map((item) => item?.overall_score)
      .filter((score) => typeof score === "number" && !Number.isNaN(score));

    const avgScore = scores.length
      ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
      : "--";

    const topBusiness = businesses.reduce((best, business) => {
      const score = vibeDataMap[business.id]?.overall_score ?? 0;
      const bestScore = best ? (vibeDataMap[best.id]?.overall_score ?? 0) : -Infinity;
      return score > bestScore ? business : best;
    }, null);

    return [
      { value: String(totalBusinesses), label: "Resorts Available", icon: Bed, featured: false },
      { value: avgScore, label: "Avg Vibe Score", icon: Smile, featured: false },
      { value: totalReviews >= 1000 ? `${Math.round(totalReviews / 1000)}k+` : String(totalReviews), label: "Reviews Analyzed", icon: MessageSquare, featured: false },
      { value: topBusiness?.name || "--", label: "Most Loved Highlight", icon: Heart, featured: true },
    ];
  })();

  // Follow Home page flow: fetch homepage data and build vibe map.
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/homepage");

        const list = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data.businesses) ? response.data.businesses : []);

        setBusinesses(list);

        const vibeMap = {};
        list.forEach((business) => {
          if (business.latest_vibe) {
            const vibe = business.latest_vibe;
            const total = vibe.positive_count + vibe.negative_count;
            vibeMap[business.id] = {
              overall_score: vibe.vibe_score,
              sentiment_distribution: {
                positive: total > 0 ? vibe.positive_count / total : 0.5,
                negative: total > 0 ? vibe.negative_count / total : 0.5,
              },
              summary: vibe.summary_text || "Guest experiences analyzed",
            };
          } else {
            vibeMap[business.id] = {
              overall_score: 0.5,
              sentiment_distribution: {
                positive: 0.5,
                negative: 0.5,
              },
              summary: "Analyzing guest experiences...",
            };
          }
        });

        setVibeDataMap(vibeMap);
        setError(null);
      } catch (err) {
        setError("Failed to load resorts. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    const next = businesses.filter((business) => {
      if (!term) return true;
      const byName = business.name?.toLowerCase().includes(term);
      const byLocation = business.location?.toLowerCase().includes(term);
      return byName || byLocation;
    });

    setFilteredBusinesses(next);
  }, [businesses, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004687] mx-auto mb-4" />
          <p className="text-gray-600">Loading resorts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
           <WaveBackground
                height="300px"        // Height of the wave section (default: "300px")
                position="bottom"     // "top" or "bottom" (default: "bottom")
                opacity={0.08}        // Global opacity multiplier 0-1 (default: 0.08)
                animate={true}       // Enable floating animation (default: false)
                className=""          // Additional Tailwind classes
              />
      <VibeDiscoverySection onSearch={setSearchTerm} stats={discoveryStats} />
      <CuratedForYouSection
        businesses={filteredBusinesses}
        vibeDataMap={vibeDataMap}
        loading={loading}
        error={error}
      />
    </div>
  );
}

export default ResortsDiscovery;

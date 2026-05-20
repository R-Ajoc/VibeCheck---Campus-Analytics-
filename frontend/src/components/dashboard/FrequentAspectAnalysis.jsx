import { useEffect, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { GraphIcon } from "../icons/AnalyticsIcons";

function formatAspectLabel(term = "") {
    if (!term) return "";
    return term.charAt(0).toUpperCase() + term.slice(1);
}

function getBarColor(count, isReliable) {
    if (count <= 0) return "bg-gray-200";

    if (!isReliable) {
        if (count >= 6) return "bg-blue-300";
        if (count >= 3) return "bg-blue-200";
        return "bg-blue-100";
    }

    if (count >= 6) return "bg-blue-500";
    if (count >= 3) return "bg-blue-400";
    return "bg-blue-300";
}

function FrequentAspectAnalysis({ data = {} }) {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setAnimate(true), 120);
        return () => clearTimeout(t);
    }, []);

    const isReliable = data?.meta?.is_reliable ?? false;

    const aspects = useMemo(() => {
        const list = Array.isArray(data?.aspects) ? data.aspects : [];
        return [...list].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    }, [data?.aspects]);

    const hasData = aspects.some(a => (a.count ?? 0) > 0);

    if (!aspects.length || !hasData) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Top Mentioned Aspects
                    </h2>
                </div>

                <p className="text-xs text-gray-400 mt-1 mb-6">
                    Most mentioned aspects from customer reviews
                </p>

                <div className="h-[260px] flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                        <GraphIcon className="w-6 h-6" />
                    </div>
                    <p className="text-gray-700 font-medium">No aspect mentions yet</p>
                    <p className="text-gray-400 text-sm">
                        Data will appear once reviews are analyzed
                    </p>
                </div>
            </div>
        );
    }

    const maxCount = Math.max(...aspects.map(a => a.count ?? 0), 1);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

            {/* HEADER */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-4 h-4 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Top Mentioned Aspects
                        </h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Most mentioned aspects from customer reviews
                    </p>
                </div>

                {/* <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${
                    isReliable
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                }`}>
                    {isReliable ? "Reliable" : "Early-stage"}
                </span> */}
            </div>

            {/* CHART AREA */}
            <div className="flex items-end gap-4 h-[260px]">

                {aspects.map((item, index) => {
                    const count = item?.count ?? 0;
                    const term = item?.term ?? "";

                    const heightPercent = (count / maxCount) * 100;

                    return (
                        <div key={term || index} className="flex flex-col items-center flex-1">

                            {/* BAR CONTAINER (fixed baseline system) */}
                            <div className="w-full flex items-end h-[200px] bg-gray-50 rounded-xl px-2">

                                <div
                                    className={`w-full rounded-md transition-all duration-700 ease-out ${getBarColor(count, isReliable)}`}
                                    style={{
                                        height: animate ? `${heightPercent}%` : "0%",
                                        transitionDelay: `${index * 60}ms`
                                    }}
                                />
                            </div>

                            {/* VALUE */}
                            <span className="text-xs font-semibold text-gray-700 mt-2">
                                {count}
                            </span>

                            {/* LABEL */}
                            <span className="text-xs text-gray-500 text-center mt-1 capitalize">
                                {formatAspectLabel(term)}
                            </span>

                        </div>
                    );
                })}

            </div>
        </div>
    );
}

export default FrequentAspectAnalysis;
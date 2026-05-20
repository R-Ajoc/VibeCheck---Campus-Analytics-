import { GraphIcon } from "../icons/AnalyticsIcons";

function ReviewProgressState({
    meta,
    sampleSize,
    minRequired,
    title,
    description
}) {
    const resolvedSampleSize = meta?.sample_size ?? sampleSize ?? 0;
    const resolvedMinRequired = meta?.min_required ?? minRequired ?? 5;

    const remaining = Math.max(resolvedMinRequired - resolvedSampleSize, 0);
    const progress = Math.min(
        (resolvedSampleSize / resolvedMinRequired) * 100,
        100
    );

    return (
        <div className="h-[260px] flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center px-6 w-full max-w-sm">

                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <GraphIcon className="w-6 h-6" />
                </div>

                <p className="font-medium text-gray-700 mt-3">
                    {title || "Almost there..."}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                    Need{" "}
                    <span className="font-semibold text-[#004687]">
                        {remaining} more review{remaining !== 1 ? "s" : ""}
                    </span>{" "}
                    {description}
                </p>

                {/* progress block */}
                <div className="w-full mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{resolvedSampleSize} collected</span>
                        <span>{resolvedMinRequired} needed</span>
                    </div>

                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#004687] rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default ReviewProgressState;
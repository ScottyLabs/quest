import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useInfiniteScroll from "react-infinite-scroll-hook";
import { type Challenge, ChallengeCard } from "@/components/challenges";

interface ChallengesListProps {
	challenges: Challenge[];
	searchQuery: string;
	isVerifyMode?: boolean;
	emptyMessage?: string;
	setChallenge: (challenge: Challenge) => void;
	setOpen: (open: boolean) => void;
}

const ITEMS_PER_PAGE = 10;

export function ChallengesList({
	challenges,
	searchQuery,
	isVerifyMode = false,
	emptyMessage = "No challenges currently available",
	setChallenge,
	setOpen,
}: ChallengesListProps) {
	const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const visibleChallenges = useMemo(
		() => challenges.slice(0, displayedItems),
		[challenges, displayedItems],
	);

	const hasMore = displayedItems < challenges.length;

	const loadMore = useCallback(() => {
		if (!hasMore || isLoadingMore) return;

		setIsLoadingMore(true);

		// For smoother UX
		requestAnimationFrame(() => {
			setDisplayedItems((prev) =>
				Math.min(prev + ITEMS_PER_PAGE, challenges.length),
			);
			setIsLoadingMore(false);
		});
	}, [hasMore, isLoadingMore, challenges.length]);

	useEffect(() => setDisplayedItems(ITEMS_PER_PAGE), []);

	const [sentryRef] = useInfiniteScroll({
		loading: isLoadingMore,
		hasNextPage: hasMore,
		onLoadMore: loadMore,
		disabled: false,
		rootMargin: "0px 0px 400px 0px", // start loading 400px before the end
	});

	return (
		<>
			{/* Results count */}
			{searchQuery && (
				<p className="text-sm text-gray-700">
					{challenges.length === 0
						? "No challenges found"
						: `Found ${challenges.length} challenge${challenges.length === 1 ? "" : "s"}`}
				</p>
			)}

			{/* Challenge cards */}
			{visibleChallenges.map((challenge, index) => (
				<ChallengeCard
					key={challenge.name}
					challenge={challenge}
					isLast={index === visibleChallenges.length - 1 && !hasMore}
					onClick={() => {
						if (!isVerifyMode && challenge.status === "locked") return;

						setChallenge(challenge);
						setOpen(true);
					}}
					isVerifyMode={isVerifyMode}
				/>
			))}

			{/* Loading indicator and sentinel */}
			{hasMore && (
				<div ref={sentryRef} className="flex justify-center py-4">
					{isLoadingMore && (
						<Loader2 className="animate-spin text-gray-400 size-6" />
					)}
				</div>
			)}

			{/* Empty state */}
			{challenges.length === 0 && !searchQuery && (
				<div className="text-center py-8 text-gray-500">{emptyMessage}</div>
			)}
		</>
	);
}

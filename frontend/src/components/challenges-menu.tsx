import { useNavigate } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChallengeData } from "@/lib/hooks/use-challenge-data";
import type { components } from "@/lib/schema.gen";

// Use OpenAPI types
type ChallengeCategoryData = {
	name: string;
	completed: number;
	total: number;
	color: string;
	flagColor: string;
};

export function ChallengesMenu() {
	const { data, loading, error } = useChallengeData();
	const [isOpen, setIsOpen] = useState(false);
	const backgroundRef = useRef<HTMLButtonElement>(null);
	const navigate = useNavigate();

	const handleBackgroundClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			setIsOpen(false);
		}
	};

	const handleBackgroundKeyDown = (e: React.KeyboardEvent) => {
		console.log("handleBackgroundKeyDown", e.key);
		if (e.key === "Escape") {
			setIsOpen(false);
		}
	};

	const handleCategoryClick = (categoryName: string) => {
		setIsOpen(false);
		navigate({ to: "/challenges", search: { category: categoryName } });
	};

	useEffect(() => {
		if (isOpen && backgroundRef.current) {
			backgroundRef.current.focus();
		}
	}, [isOpen]);

	return (
		<div className="relative">
			<button
				type="button"
				className="flex items-center bg-white rounded-full px-3 py-2 shadow text-sm font-bold gap-1 hover:bg-gray-50 transition-colors"
				onClick={() => setIsOpen(true)}
			>
				<Flag size={18} className="text-red-600" />
				<span>
					{data?.totalCompleted ?? 0}/{data?.totalChallenges ?? 0}
				</span>
			</button>
			{isOpen &&
				createPortal(
					<button
						ref={backgroundRef}
						className="fixed inset-0 bg-[#202020] opacity-95 z-[99999] isolate border-0 p-0"
						onClick={handleBackgroundClick}
						onKeyDown={handleBackgroundKeyDown}
						type="button"
					>
						<div className="absolute top-4 left-4 max-w-md">
							<div className="p-6 relative">
								{loading && (
									<div className="text-white text-center py-8">
										Loading challenges...
									</div>
								)}

								{error && (
									<div className="text-red-400 text-center py-8">{error}</div>
								)}

								{data && (
									<div className="space-y-3">
										{/* All Challenges Row (Highlighted) */}
										<div className="flex items-center gap-3">
											<div className="bg-[#F5D68C] rounded-full px-4 py-2 flex items-center gap-2 border border-purple-200">
												<Flag size={16} fill="#D7263D" />
												<span className="text-black font-semibold text-sm">
													{data.totalCompleted}/{data.totalChallenges}
												</span>
											</div>
											<span className="text-[#F5D68C] font-extrabold">
												Challenges
											</span>
										</div>

										{/* Category Rows */}
										{data.categories?.map((category: ChallengeCategoryData) => (
											<button
												key={category.name}
												className="flex items-center gap-3 w-full text-left hover:bg-gray-800 rounded-lg p-2 transition-colors"
												onClick={() => handleCategoryClick(category.name)}
												type="button"
											>
												<div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 border border-purple-200">
													<Flag size={16} fill={category.flagColor} />
													<span className="text-black font-semibold text-sm">
														{category.completed}/{category.total}
													</span>
												</div>
												<span className="text-white font-extrabold">
													{category.name}
												</span>
											</button>
										))}
									</div>
								)}
							</div>
						</div>
					</button>,
					document.body,
				)}
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChallengeCircle } from "@/components/challenge-circle";
import { fetchChallengeData } from "@/lib/challenge-data";
import type { ChallengeCategoryData } from "@/lib/types";

export const Route = createFileRoute("/corners")({
	component: CornersPage,
});

function CornersPage() {
	const [challengeData, setChallengeData] = useState<ChallengeCategoryData[]>(
		[],
	);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadChallengeData() {
			try {
				const data = await fetchChallengeData();
				setChallengeData(data.categories);
			} catch (error) {
				console.error("Failed to load challenge data:", error);
			} finally {
				setLoading(false);
			}
		}
		loadChallengeData();
	}, []);

	// Find the Corners of Carnegie category
	const cornersCategory = challengeData.find(
		(cat) => cat.name === "Corners of Carnegie",
	);

	if (loading) {
		return (
			<div className="min-h-screen bg-challenge-4-light flex flex-col items-center justify-center p-4">
				<div className="text-center text-2xl font-bold font-['Open_Sans']">
					Loading...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-challenge-4-light flex flex-col items-center justify-center p-4">
			{/* Header */}
			<div className="w-full max-w-sm bg-challenge-4 rounded-t-[34px] p-4 mb-4">
				<div className="flex items-center justify-center gap-4">
					{cornersCategory ? (
						<ChallengeCircle
							category={cornersCategory}
							size="md"
							showIcon={true}
						/>
					) : (
						<div className="w-24 h-24 bg-challenge-4-selected rounded-full flex items-center justify-center">
							<div className="w-16 h-16 bg-white rounded-full"></div>
						</div>
					)}
					<div className="text-white text-4xl font-extrabold font-['Open_Sans'] tracking-wide text-center">
						Corners of Carnegie
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="w-full max-w-sm bg-challenge-4-light rounded-b-[34px] p-4">
				<div className="bg-white rounded-[20px] p-6 shadow-lg">
					{/* Mail Notification */}
					<div className="bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] p-4 mb-4">
						<div className="text-center text-secondary-foreground text-2xl font-extrabold font-['Open_Sans'] tracking-wide">
							You've Got Mail!
						</div>
					</div>

					{/* Placeholder Image */}
					<div className="flex justify-center mb-4">
						<div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
							<img
								src="https://placehold.co/266x271"
								alt="Corners of Carnegie"
								className="w-full h-full object-cover rounded-lg"
							/>
						</div>
					</div>

					{/* CMU Property Notice */}
					<div className="text-center text-secondary-foreground text-2xl font-extrabold font-['Open_Sans'] tracking-wide">
						Do not remove CMU Property
					</div>
				</div>
			</div>
		</div>
	);
}

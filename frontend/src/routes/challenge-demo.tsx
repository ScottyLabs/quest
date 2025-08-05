import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChallengeCircle } from "@/components/challenge-circle";
import { fetchChallengeData } from "@/lib/challenge-data";
import type { ChallengeCategoryData } from "@/lib/types";

export const Route = createFileRoute("/challenge-demo")({
	component: ChallengeDemoPage,
});

function ChallengeDemoPage() {
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

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
				<div className="text-center text-2xl font-bold font-['Open_Sans']">
					Loading...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl font-bold font-['Open_Sans'] text-center mb-8">
					Challenge Circles Demo
				</h1>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{challengeData.map((category, index) => (
						<div
							key={category.name}
							className="bg-white rounded-lg p-6 shadow-lg"
						>
							<div className="flex flex-col items-center space-y-4">
								<ChallengeCircle
									category={category}
									size="lg"
									showIcon={true}
								/>
								<div className="text-center">
									<h3 className="text-xl font-bold font-['Open_Sans'] mb-2">
										{category.name}
									</h3>
									<p className="text-sm text-gray-600 font-['Open_Sans']">
										{category.completed}/{category.total} completed
									</p>
									<div className="mt-2">
										<span
											className="inline-block w-4 h-4 rounded-full mr-2"
											style={{ backgroundColor: category.color }}
										></span>
										<span className="text-xs font-['Open_Sans']">
											Color: {category.color}
										</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="mt-12 text-center">
					<h2 className="text-2xl font-bold font-['Open_Sans'] mb-4">
						Different Sizes
					</h2>
					<div className="flex justify-center items-center space-x-8">
						{challengeData.slice(0, 3).map((category) => (
							<div key={`${category.name}-sm`} className="text-center">
								<ChallengeCircle
									category={category}
									size="sm"
									showIcon={true}
								/>
								<p className="text-sm font-['Open_Sans'] mt-2">Small</p>
							</div>
						))}
					</div>
					<div className="flex justify-center items-center space-x-8 mt-8">
						{challengeData.slice(0, 3).map((category) => (
							<div key={`${category.name}-md`} className="text-center">
								<ChallengeCircle
									category={category}
									size="md"
									showIcon={true}
								/>
								<p className="text-sm font-['Open_Sans'] mt-2">Medium</p>
							</div>
						))}
					</div>
					<div className="flex justify-center items-center space-x-8 mt-8">
						{challengeData.slice(0, 3).map((category) => (
							<div key={`${category.name}-lg`} className="text-center">
								<ChallengeCircle
									category={category}
									size="lg"
									showIcon={true}
								/>
								<p className="text-sm font-['Open_Sans'] mt-2">Large</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

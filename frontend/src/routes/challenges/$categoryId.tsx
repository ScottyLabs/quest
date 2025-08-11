import { createFileRoute, notFound } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useState } from "react";
import {
	type Challenge,
	ChallengeDrawer,
	ChallengesDrawerContent,
	ChallengesMode,
	useAppContext,
	VerifyDrawerContent,
	VerifyMode,
} from "@/components/challenges";
import { PageLayout } from "@/components/page-layout";
import { requireAuth } from "@/lib/auth";
import { type CategoryId, colorClasses } from "@/lib/data/categories";

export const Route = createFileRoute("/challenges/$categoryId")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	params: {
		parse: (params) => {
			if (!(params.categoryId in colorClasses)) {
				// It's not a valid CategoryId
				throw notFound();
			}

			return { categoryId: params.categoryId };
		},
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();
	const { categoryId } = Route.useParams();
	const { adminMode } = useAppContext();

	// biome-ignore lint/style/noNonNullAssertion: won't be accessing this unless it's not null
	const [challenge, setChallenge] = useState<Challenge>(null!);
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<PageLayout
			currentPath="/challenges/$categoryId"
			categoryId={categoryId as CategoryId}
			user={user}
		>
			<div className="px-4 pt-6 max-w-xl mx-auto [view-transition-name:main-content] flex flex-col gap-4">
				{/* Search Bar */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
					<input
						type="text"
						placeholder="Search challenges..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-default-selected focus:border-transparent"
					/>

					{searchQuery && (
						<X
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
						/>
					)}
				</div>

				{/* Render appropriate mode */}
				{adminMode === "verify" ? (
					<VerifyMode
						categoryId={categoryId as CategoryId}
						searchQuery={searchQuery}
						setChallenge={setChallenge}
						setOpen={setOpen}
					/>
				) : (
					<ChallengesMode
						categoryId={categoryId as CategoryId}
						searchQuery={searchQuery}
						setChallenge={setChallenge}
						setOpen={setOpen}
					/>
				)}
			</div>

			<ChallengeDrawer
				open={open}
				setOpen={setOpen}
				challenge={challenge}
				isVerifyMode={adminMode === "verify"}
			>
				{adminMode === "verify" ? (
					<VerifyDrawerContent challenge={challenge} />
				) : (
					<ChallengesDrawerContent />
				)}
			</ChallengeDrawer>
		</PageLayout>
	);
}

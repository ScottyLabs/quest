import { createFileRoute, notFound } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	type Challenge,
	ChallengeDrawer,
	ChallengesDrawerContent,
	ChallengesMode,
	VerifyDrawerContent,
	VerifyMode,
} from "@/components/challenges";
import { PageLayout } from "@/components/page-layout";
import { useAppContext } from "@/lib/app-context";
import { requireAuth } from "@/lib/auth";
import { type CategoryId, colorClasses } from "@/lib/data/categories";
import { useDebounce } from "@/lib/utils";

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

	const [open, setOpen] = useState(false);
	const handleSetOpen = useCallback((newOpen: boolean) => setOpen(newOpen), []);

	// biome-ignore lint/style/noNonNullAssertion: won't be accessing this unless it's not null
	const [challenge, setChallenge] = useState<Challenge>(null!);
	const handleSetChallenge = useCallback(
		(newChallenge: Challenge) => setChallenge(newChallenge),
		[],
	);

	const [searchInput, setSearchInput] = useState("");
	const searchQuery = useDebounce(searchInput, 100);
	const handleClearSearch = useCallback(() => setSearchInput(""), []);
	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value),
		[],
	);

	const ModeComponent = useMemo(() => {
		const props = {
			categoryId: categoryId as CategoryId,
			searchQuery,
			setChallenge: handleSetChallenge,
			setOpen: handleSetOpen,
		};

		return adminMode === "verify" ? (
			<VerifyMode {...props} />
		) : (
			<ChallengesMode {...props} />
		);
	}, [adminMode, categoryId, handleSetChallenge, handleSetOpen, searchQuery]);

	const DrawerContent = useMemo(() => {
		return adminMode === "verify" ? (
			<VerifyDrawerContent challenge={challenge} />
		) : (
			<ChallengesDrawerContent />
		);
	}, [adminMode, challenge]);

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
						value={searchInput}
						onChange={handleSearchChange}
						className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-default-selected focus:border-transparent"
					/>

					{searchInput && (
						<button
							type="button"
							onClick={handleClearSearch}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
							aria-label="Clear search"
						>
							<X className="text-gray-400 hover:text-gray-600 size-5" />
						</button>
					)}
				</div>

				{/* Render appropriate mode */}
				{ModeComponent}
			</div>

			<ChallengeDrawer
				open={open}
				setOpen={setOpen}
				challenge={challenge}
				isVerifyMode={adminMode === "verify"}
			>
				{DrawerContent}
			</ChallengeDrawer>
		</PageLayout>
	);
}

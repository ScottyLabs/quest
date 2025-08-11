import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ChallengeDrawer } from "@/components/challenge-drawer";
import { type Challenge, ChallengeCard } from "@/components/challenges/card";
import { PageLayout } from "@/components/page-layout";
import { useApi } from "@/lib/api-context";
import { adminMiddleware } from "@/lib/auth";
import { useGeolocation } from "@/lib/native/geolocation";

export const Route = createFileRoute("/verify")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();
	const { $api } = useApi();

	// biome-ignore lint/style/noNonNullAssertion: won't be accessing this unless it's not null
	const [challenge, setChallenge] = useState<Challenge>(null!);

	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const { isQuerying, queryPosition } = useGeolocation();

	const { data } = $api.useQuery("get", "/api/admin/challenges");
	const {
		mutate: updateGeolocation,
		isPending,
		isSuccess,
	} = $api.useMutation("put", "/api/admin/challenges/geolocation");

	// Hide challenges that already have geolocation data set and apply search filter
	const challenges = useMemo(() => {
		const filtered =
			data?.challenges.filter((challenge) => !challenge.location_accuracy) ||
			[];

		if (!searchQuery.trim()) {
			return filtered;
		}

		return filtered.filter(
			(challenge) =>
				challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				challenge.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
				challenge.description.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [data, searchQuery]);

	const handleSetLocation = () => {
		queryPosition(5000, async (pos) => {
			await updateGeolocation({
				body: {
					name: challenge.name,
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					location_accuracy: pos.coords.accuracy,
				},
			});
		});
	};

	return (
		<PageLayout currentPath="/verify" user={user}>
			<div className="[view-transition-name:main-content] px-4 pt-6 max-w-xl mx-auto flex flex-col gap-4">
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

				{/* Results count */}
				{searchQuery && (
					<p className="text-sm text-gray-700">
						{challenges.length === 0
							? "No challenges found"
							: `Found ${challenges.length} challenge${challenges.length === 1 ? "" : "s"}`}
					</p>
				)}

				{/* Challenge cards */}
				{challenges.map((challenge, index) => (
					<ChallengeCard
						key={challenge.name}
						challenge={challenge}
						isLast={index === challenges.length - 1}
						onClick={() => {
							setChallenge(challenge);
							setOpen(true);
						}}
						isVerifyMode
					/>
				))}

				{/* Empty state */}
				{challenges.length === 0 && !searchQuery && (
					<div className="text-center py-8 text-gray-500">
						No challenges need location verification
					</div>
				)}
			</div>

			<ChallengeDrawer
				open={open}
				setOpen={setOpen}
				challenge={challenge}
				isVerifyMode
			>
				<p className="mt-2 mb-2 text-gray-700 text-sm">
					Is this one of your assigned posters? Hold your phone up to where you
					posted it, enable location permissions, and press the button below.
				</p>
				<p className="mb-4 text-gray-500 text-xs">
					Please wait until your precise location is determined before you close
					the drawer.
				</p>

				<button
					type="button"
					disabled={isQuerying || isPending || isSuccess}
					onClick={handleSetLocation}
					className="card-confirm border-2 border-default-selected bg-default text-white cursor-pointer py-2 text-lg font-bold rounded-2xl mb-4"
				>
					{isQuerying || isPending ? (
						<Loader2 className="mx-auto animate-spin size-7 text-white" />
					) : isSuccess ? (
						"Location set successfully"
					) : (
						"Set location (irreversible)"
					)}
				</button>
			</ChallengeDrawer>
		</PageLayout>
	);
}

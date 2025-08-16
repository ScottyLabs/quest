import { Loader2 } from "lucide-react";
import {
	type Challenge,
	ChallengesList,
	useChallenges,
} from "@/components/challenges";
import { useApi } from "@/lib/app-context";
import type { CategoryId } from "@/lib/data/categories";
import { useGeolocation } from "@/lib/native/geolocation";

interface VerifyModeProps {
	categoryId: CategoryId;
	searchQuery: string;
	setChallenge: (challenge: Challenge) => void;
	setOpen: (open: boolean) => void;
}

export function VerifyMode({
	categoryId,
	searchQuery,
	setChallenge,
	setOpen,
}: VerifyModeProps) {
	const { challenges, isLoading } = useChallenges({
		searchQuery,
		categoryId,
		mode: "verify",
	});

	// Show loading state for initial load
	if (isLoading && challenges.length === 0) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="animate-spin text-gray-400 size-8" />
			</div>
		);
	}

	return (
		<ChallengesList
			challenges={challenges}
			searchQuery={searchQuery}
			isVerifyMode={true}
			emptyMessage="No challenges need location verification"
			setChallenge={setChallenge}
			setOpen={setOpen}
		/>
	);
}

interface VerifyDrawerContentProps {
	challenge: Challenge;
}

export function VerifyDrawerContent({ challenge }: VerifyDrawerContentProps) {
	const { $api } = useApi();
	const { isQuerying, queryPosition } = useGeolocation();

	const {
		mutate: updateGeolocation,
		isPending,
		isSuccess,
	} = $api.useMutation("put", "/api/admin/challenges/geolocation");

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
		<>
			<p className="mb-2 text-gray-700 text-sm">
				Is this one of your assigned posters? Hold your phone up to where you
				posted it, enable location permissions, and press the button below.
			</p>
			<p className="mb-4 text-gray-500 text-xs">
				{challenge.has_location_data || isSuccess ? (
					<>
						Has someone already set this location?{" "}
						<button
							type="button"
							onClick={handleSetLocation}
							disabled={isQuerying || isPending}
							className="underline hover:text-gray-700 transition-colors"
						>
							Reset it
						</button>
					</>
				) : (
					"Please wait until your precise location is determined before you close the drawer."
				)}
			</p>

			<button
				type="button"
				disabled={
					isQuerying || isPending || challenge.has_location_data || isSuccess
				}
				onClick={handleSetLocation}
				className={`w-full py-2 text-lg font-bold rounded-2xl mb-4 flex items-center justify-center gap-2 ${
					(challenge.has_location_data || isSuccess) &&
					!(isQuerying || isPending)
						? "bg-gray-200 text-gray-500 cursor-not-allowed"
						: "card-confirm border-2 border-default-selected bg-default text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				}`}
			>
				{isQuerying || isPending ? (
					<>
						<Loader2 className="animate-spin size-5" />
						Getting location...
					</>
				) : challenge.has_location_data || isSuccess ? (
					"Location set"
				) : (
					"Set location"
				)}
			</button>
		</>
	);
}

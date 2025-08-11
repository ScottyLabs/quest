import { Loader2 } from "lucide-react";
import {
	type Challenge,
	ChallengesList,
	useChallenges,
} from "@/components/challenges";
import { useApi } from "@/lib/api-context";
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
	const { challenges } = useChallenges({
		searchQuery,
		categoryId,
		mode: "verify",
	});

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
		</>
	);
}

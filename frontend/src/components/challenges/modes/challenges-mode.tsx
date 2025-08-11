import { Loader2 } from "lucide-react";
import type { CategoryId } from "@/lib/data/categories";
import { useGeolocation } from "@/lib/native/geolocation";
import { useChallenges } from "../hooks/use-challenges";
import type { Challenge } from "../ui/card";
import { ChallengesList } from "../ui/list";

interface ChallengesModeProps {
	categoryId: CategoryId;
	searchQuery: string;
	setChallenge: (challenge: Challenge) => void;
	setOpen: (open: boolean) => void;
}

export function ChallengesMode({
	categoryId,
	searchQuery,
	setChallenge,
	setOpen,
}: ChallengesModeProps) {
	const { challenges } = useChallenges({
		searchQuery,
		categoryId,
		mode: "challenges",
	});

	return (
		<ChallengesList
			challenges={challenges}
			searchQuery={searchQuery}
			isVerifyMode={false}
			emptyMessage="No challenges currently available"
			setChallenge={setChallenge}
			setOpen={setOpen}
		/>
	);
}

export function ChallengesDrawerContent() {
	const { isQuerying } = useGeolocation();

	return (
		<>
			<p className="mt-2 mb-2 text-gray-700 text-sm">
				Have you found this challenge? Press the "complete" button below to open
				the QR code scanner and verify your location.
			</p>
			<p className="mb-4 text-gray-500 text-xs">
				Please wait until your precise location is determined before you close
				the drawer.
			</p>

			<button
				type="button"
				disabled={isQuerying /*|| isPending || isSuccess*/}
				className="card-confirm border-2 border-default-selected bg-default text-white cursor-pointer py-2 text-lg font-bold rounded-2xl mb-4"
			>
				{isQuerying ? (
					<Loader2 className="mx-auto animate-spin size-7 text-white" />
				) : (
					/*isSuccess ? (
					"Challenge completed successfully"
				) :*/ "Complete challenge"
				)}
			</button>
		</>
	);
}

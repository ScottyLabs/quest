import type { Challenge } from "@/components/challenges";

interface Completed {
	challenge: Challenge;
}

export function Completed({ challenge }: Completed) {
	return (
		<>
			<p className="mb-2 text-gray-700 text-sm">
				Congratulations! You've already completed this challenge.
			</p>
			<p className="mb-4 text-gray-500 text-xs">
				Check out your progress in the journal or try other challenges.
			</p>

			<button
				type="button"
				disabled
				className="w-full py-2 text-lg font-bold rounded-2xl mb-4 bg-gray-200 text-gray-500 cursor-not-allowed"
			>
				Challenge completed
			</button>
		</>
	);
}

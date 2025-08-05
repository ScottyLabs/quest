import { useQuery } from "@tanstack/react-query";
import type { LeaderboardEntry } from "@/lib/types";
import { snakeToCamelObject } from "@/lib/utils";

export const useLeaderboard = () => {
	const query = useQuery({
		queryKey: ["leaderboard"],
		queryFn: async () => {
			const res = await fetch("http://localhost:3000/api/leaderboard/user");
			if (!res.ok) {
				throw new Error("Failed to fetch leaderboard data");
			}
			return snakeToCamelObject(await res.json()) as LeaderboardEntry[];
		},
	});

	return query;
};

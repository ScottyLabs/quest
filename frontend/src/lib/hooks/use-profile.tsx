import { useQuery } from "@tanstack/react-query";
import type {
	CategoryName,
	GetProfileResponse,
	UserProfile,
} from "@/lib/types";
import { snakeToCamelObject } from "@/lib/utils";
import { DORM_GROUPS } from "@/routes/dorm-select";

const dormToName = (dorm: string): string | null => {
	const group = DORM_GROUPS.find((group) =>
		group.dorms.includes(dorm as never),
	);
	return group ? group.name : null;
};

export const useProfileData = () => {
	const query = useQuery<GetProfileResponse | null>({
		queryKey: ["profile"],
		queryFn: async () => {
			const res = await fetch("http://localhost:3000/api/profile");
			if (!res.ok) {
				throw new Error("Failed to fetch profile data");
			}
			return res.json();
		},
	});
	if (query.isError) {
		console.error("Error fetching profile data:", query.error);
	}
	if (!query.data) {
		return query as unknown as typeof query & { data: null };
	}
	console.log("Precap profile data:", query.data);
	query.data = snakeToCamelObject(query.data) as GetProfileResponse;
	console.log("Raw profile data:", query.data);
	const newQueryData = {
		...query.data,
		house: {
			dorm: query.data?.dorm || "",
			name: dormToName(query.data?.dorm) || "",
		},
		categoryCompletions: (
			Object.keys(
				query.data.challengesCompleted.byCategory,
			) as Array<CategoryName>
		).map((key: CategoryName) => ({
			name: key,
			percentage:
				(query.data
					? query.data.challengesCompleted.byCategory[key] /
						query.data.totalChallenges.byCategory[key]
					: 0) * 100 || 0,
		})),
		stamps: Array.from({ length: 7 }, (_, i) => {
			const day = new Date();
			day.setDate(day.getDate() - i);
			return query.data?.recentActivityDays.includes(
				day.toISOString().split("T")[0] as string,
			);
		}),
	};

	const newQuery = {
		...query,
		data: newQueryData as UserProfile,
	};

	console.log("Profile data:", newQuery.data);

	return newQuery;
};

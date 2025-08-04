import { useQuery } from "@tanstack/react-query";
import type { GetProfileResponse, UserProfile } from "@/lib/types";
import { DORM_GROUPS } from "@/routes/dorm-select";

const dormToName = (dorm: string): string | null => {
	const group = DORM_GROUPS.find((group) => group.dorms.includes(dorm));
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
		return query;
	}
	const newQuery = {
		...query.data,
		house: {
			dorm: query.data?.dorm || "",
			name: dormToName(query.data?.dorm) || "",
		},
	} as UserProfile;
	return newQuery;
};

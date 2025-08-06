import { useApi } from "@/lib/api-context";

export const usePrizeData = () => {
	const { $api } = useApi();
	const query = $api.useQuery("get", "/api/rewards");

	if (query.isError) {
		console.error("Error fetching prize data:", query.error);
	}

	return query;
};

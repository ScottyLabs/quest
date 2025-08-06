import { useApi } from "@/lib/api-context";

export const useJournalData = () => {
	const { $api } = useApi();
	const query = $api.useQuery("get", "/api/journal");

	if (query.isError) {
		console.error("Error fetching journal data:", query.error);
	}

	return query;
};

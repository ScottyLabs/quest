import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";
import type { FilterOption } from "@/components/challenges/filter-card";

interface FilterContextType {
	filter: FilterOption;
	setFilter: (filter: FilterOption) => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: PropsWithChildren) {
	const [filter, setFilter] = useState<FilterOption>("all");

	return (
		<FilterContext.Provider value={{ filter, setFilter }}>
			{children}
		</FilterContext.Provider>
	);
}

export const useFilter = () => {
	const context = useContext(FilterContext);
	if (!context) {
		throw new Error("useFilter must be used within a FilterProvider");
	}

	return context;
};

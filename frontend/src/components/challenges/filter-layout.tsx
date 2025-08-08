import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";
import type { FilterOption } from "@/components/challenges/filter-card";

interface FilterContextType {
	selectedFilter: FilterOption;
	setSelectedFilter: (filter: FilterOption) => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterLayout({ children }: PropsWithChildren) {
	const [selectedFilter, setSelectedFilter] = useState<FilterOption>("all");

	return (
		<FilterContext.Provider value={{ selectedFilter, setSelectedFilter }}>
			{children}
		</FilterContext.Provider>
	);
}

export const useFilterContext = () => {
	const context = useContext(FilterContext);
	if (!context) {
		throw new Error("useFilterContext must be used within a FilterProvider");
	}
	return context;
};

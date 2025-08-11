import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";
import type { FilterOption } from "@/components/challenges";

type AdminMode = "challenges" | "verify";

interface AppContextType {
	filter: FilterOption;
	setFilter: (filter: FilterOption) => void;
	adminMode: AdminMode;
	setAdminMode: (mode: AdminMode) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
	const [filter, setFilter] = useState<FilterOption>("all");
	const [adminMode, setAdminMode] = useState<AdminMode>("challenges");

	return (
		<AppContext.Provider value={{ filter, setFilter, adminMode, setAdminMode }}>
			{children}
		</AppContext.Provider>
	);
}

export const useAppContext = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useAppContext must be used within an AppProvider");
	}

	return context;
};

// Backward compatibility exports
export const FilterProvider = AppProvider;
export const useFilter = () => {
	const { filter, setFilter } = useAppContext();
	return { filter, setFilter };
};

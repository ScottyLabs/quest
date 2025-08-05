import { createContext, type ReactNode } from "react";

type StyleType = {
	color: string;
};

// Context setup
export const StyleContext = createContext<StyleType>({
	color: "#000000", // Default color, can be changed as needed
});

export function StyleProvider({ children }: { children: ReactNode }) {
	const client: StyleType = {
		color: "#000000", // Default color, can be changed as needed
	};

	return (
		<StyleContext.Provider value={client}>{children}</StyleContext.Provider>
	);
}

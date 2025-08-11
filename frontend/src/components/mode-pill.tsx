import { useAppContext } from "@/components/challenges";

interface ModePillProps {
	isAdmin: boolean;
}

export function ModePill({ isAdmin }: ModePillProps) {
	const { adminMode, setAdminMode } = useAppContext();

	if (!isAdmin) return null;

	return (
		<button
			type="button"
			onClick={() =>
				setAdminMode(adminMode === "challenges" ? "verify" : "challenges")
			}
			className="flex card-primary items-center justify-center bg-white hover:bg-gray-100 rounded-full px-3 py-2 text-sm font-bold gap-1 min-w-[80px]"
			aria-label={`Switch to ${adminMode === "challenges" ? "verify" : "challenges"} mode`}
		>
			<span
				className={`w-2 h-2 rounded-full ${adminMode === "verify" ? "bg-green-500" : "bg-blue-500"}`}
			/>
			<span>{adminMode === "verify" ? "Verify" : "Normal"}</span>
		</button>
	);
}

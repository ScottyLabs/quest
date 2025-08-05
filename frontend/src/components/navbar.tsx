import { Link } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import type { ValidPath } from "@/main";

interface NavbarProps {
	currentPath: ValidPath;
}

export function Navbar({ currentPath }: NavbarProps) {
	const { client } = useApi();
	const { data, isLoading } = client.useQuery("get", "/api/profile");

	// Check if current path is a challenges route (/ or /challenges/*)
	const isChallengesActive =
		currentPath === "/" || currentPath.startsWith("/challenges/");

	// Show Trade while loading or if not staff, show Verify only if loaded and staff
	const isStaff = !isLoading && data?.is_staff;
	const showVerify = !isLoading && isStaff;

	return (
		<div className="flex gap-2">
			<Link to="/profile" className="[&.active]:font-bold">
				Profile
			</Link>
			<Link to="/leaderboard" className="[&.active]:font-bold">
				Leaderboard
			</Link>
			<Link to="/" className={`${isChallengesActive ? "font-bold" : ""}`}>
				Challenges
			</Link>
			<Link
				to={showVerify ? "/verify" : "/trade"}
				className="[&.active]:font-bold"
			>
				{showVerify ? "Verify" : "Trade"}
			</Link>
			<Link to="/about" className="[&.active]:font-bold">
				About
			</Link>
		</div>
	);
}

import { Link } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import type { ValidPath } from "@/main";

interface NavbarProps {
	currentPath: ValidPath;
}

export function Navbar({ currentPath }: NavbarProps) {
	const { $api } = useApi();
	const { data, isLoading } = $api.useQuery("get", "/api/profile");

	// Check if current path is a challenges route (/ or /challenges/*)
	const isChallengesActive =
		currentPath === "/" || currentPath.startsWith("/challenges/");

	// Show Trade while loading OR if not admin, show Verify only if loaded and admin
	const isAdmin = !isLoading && data?.groups.includes("O-Quest Admin");
	const showVerify = !isLoading && isAdmin;

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

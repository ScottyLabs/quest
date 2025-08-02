import { Link } from "@tanstack/react-router";
import type { ValidPath } from "@/main";

interface NavbarProps {
	currentPath: ValidPath;
}

export function Navbar({ currentPath }: NavbarProps) {
	// Check if current path is a challenges route (/ or /challenges/*)
	const isChallengesActive =
		currentPath === "/" || currentPath.startsWith("/challenges/");

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
			<Link to="/trade" className="[&.active]:font-bold">
				Trade
			</Link>
			<Link to="/about" className="[&.active]:font-bold">
				About
			</Link>
		</div>
	);
}

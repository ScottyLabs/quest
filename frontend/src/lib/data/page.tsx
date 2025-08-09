import {
	BarChart2,
	Info,
	type LucideIcon,
	ScanQrCode,
	ShoppingCart,
	Trophy,
	User,
} from "lucide-react";
import { typedFromEntries } from "@/lib/utils";
import type { FileRoutesByFullPath } from "@/routeTree.gen";

export type ValidPath = keyof FileRoutesByFullPath;

export const navbarPages = [
	{ to: "/profile", label: "Profile", Icon: User },
	{ to: "/leaderboard", label: "Leaderboard", Icon: BarChart2 },
	{
		to: "/challenges/$categoryId",
		label: "Challenges",
		Icon: Trophy,
	},
	{
		to: "/terrier-trade",
		label: "Terrier Trade",
		Icon: ShoppingCart,
	},
	{
		to: "/verify",
		label: "Verify",
		Icon: ScanQrCode,
	},
	{ to: "/about", label: "About", Icon: Info },
] as const;

// Reverse lookups
export const pageObject = typedFromEntries<
	ValidPath,
	{ label: string; Icon: LucideIcon }
>(navbarPages.map(({ to, label, Icon }) => [to, { label, Icon }]));

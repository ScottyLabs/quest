import type { Challenge } from "@/components/challenges";
import { AvailableDrawerContent } from "@/components/challenges/ui/drawer-content/available";
import { CompletedDrawerContent } from "@/components/challenges/ui/drawer-content/completed";

interface DrawerContentSelectorProps {
	challenge: Challenge;
}

export function DrawerContentSelector({
	challenge,
}: DrawerContentSelectorProps) {
	if (challenge.status === "available") {
		return <AvailableDrawerContent />;
	}

	if (challenge.status === "completed") {
		return <CompletedDrawerContent />;
	}
}

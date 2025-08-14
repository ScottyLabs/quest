import type { Challenge } from "@/components/challenges";
import { Available } from "@/components/challenges/ui/drawer-content/available";
import { Completed } from "@/components/challenges/ui/drawer-content/completed";

interface DrawerContentSelectorProps {
	challenge: Challenge;
}

export function DrawerContentSelector({
	challenge,
}: DrawerContentSelectorProps) {
	if (challenge.status === "available") {
		return <Available challenge={challenge} />;
	}

	if (challenge.status === "completed") {
		return <Completed challenge={challenge} />;
	}
}

import { createFileRoute } from "@tanstack/react-router";
import { AuthTest } from "@/components/auth";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return <AuthTest />;
}

import { createFileRoute } from "@tanstack/react-router";
import { useApiClient } from "@/lib/api-context";
import { redirectIfAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ context }) => {
		return await redirectIfAuthenticated(context.baseUrl);
	},
	validateSearch: (search: Record<string, unknown>) => {
		return {
			from: typeof search.from === "string" ? search.from : undefined,
		};
	},
	component: Login,
});

function Login() {
	const { login } = useApiClient();
	const { from } = Route.useSearch();

	return (
		<div className="[view-transition-name:main-content]">
			<h1 className="text-2xl">Login</h1>
			<button type="button" onClick={() => login(from || "/")}>
				Login
			</button>
		</div>
	);
}

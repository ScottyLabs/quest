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

	const handleLogin = () => {
		if (from) {
			const redirectUri = new URL(from, window.location.origin);
			login(redirectUri.toString());
		} else {
			login();
		}
	};

	return (
		<div>
			<h1 className="text-2xl">Login</h1>
			<button type="button" onClick={handleLogin}>
				Login
			</button>
		</div>
	);
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { ApiProvider, useApi } from "@/lib/api-context";
import { routeTree } from "@/routeTree.gen";
import "@/main.css";

const queryClient = new QueryClient();
const router = createRouter({
	routeTree,
	context: { baseUrl: "" },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

function AppWithRouter() {
	const { baseUrl } = useApi();

	return <RouterProvider router={router} context={{ baseUrl }} />;
}

// biome-ignore lint/style/noNonNullAssertion: guaranteed to exist in index.html
const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<ApiProvider>
					<AppWithRouter />

					<ReactQueryDevtools initialIsOpen={false} />
					<TanStackRouterDevtools router={router} />
				</ApiProvider>
			</QueryClientProvider>
		</StrictMode>,
	);
}

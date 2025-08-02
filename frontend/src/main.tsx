import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { ApiProvider, useApi } from "@/lib/api-context";
import { setupDeepLinks } from "@/lib/deep-link";
import { type FileRoutesByFullPath, routeTree } from "@/routeTree.gen";
import "@/main.css";

setupDeepLinks();

type ValidPath = keyof FileRoutesByFullPath;

const pageOrder: ValidPath[] = [
	"/profile",
	"/leaderboard",
	"/",
	"/challenges/1",
	"/challenges/2",
	"/challenges/3",
	"/challenges/4",
	"/challenges/5",
	"/challenges/6",
	"/trade",
	"/about",
];

const queryClient = new QueryClient();
const router = createRouter({
	routeTree,
	scrollRestoration: true,
	defaultViewTransition: {
		// Create a slide-left/slide-right transition based on the order of pages
		types: ({ fromLocation, toLocation }) => {
			const from = pageOrder.indexOf(fromLocation?.pathname as ValidPath);
			const to = pageOrder.indexOf(toLocation?.pathname as ValidPath);

			if (to === -1 || from === -1 || to === from) {
				return [];
			}

			return [to > from ? "slide-left" : "slide-right"];
		},
	},
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

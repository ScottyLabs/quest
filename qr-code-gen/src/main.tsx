import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App.tsx";
import "@/main.css";

// biome-ignore lint/style/noNonNullAssertion: guaranteed to exist in index.html
const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
	const root = createRoot(rootElement);
	root.render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

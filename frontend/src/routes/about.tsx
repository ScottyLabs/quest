import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<div className="[view-transition-name:main-content]">Hello "/about"!</div>
	);
}

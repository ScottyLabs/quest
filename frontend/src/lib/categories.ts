export const categories = [
	{ id: "all", label: "All" },
	{ id: "the-essentials", label: "The Essentials" },
	{ id: "campus-of-bridges", label: "Campus of Bridges" },
	{ id: "lets-eat", label: "Let's Eat!" },
	{ id: "cool-corners-of-carnegie", label: "Cool Corners of Carnegie" },
	{ id: "minor-major-general", label: "Minor-Major General" },
	{ id: "off-campus-adventures", label: "Off-Campus Adventures" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const colorClasses = {
	all: {
		text: "text-default",
		primary: "bg-default",
		secondary: "bg-default-light",
		selected: "bg-default-selected",
		border: "border-default",
	},
	"the-essentials": {
		text: "text-challenge-1",
		primary: "bg-challenge-1",
		secondary: "bg-challenge-1-light",
		selected: "bg-challenge-1-selected",
		border: "border-challenge-1",
	},
	"campus-of-bridges": {
		text: "text-challenge-2",
		primary: "bg-challenge-2",
		secondary: "bg-challenge-2-light",
		selected: "bg-challenge-2-selected",
		border: "border-challenge-2",
	},
	"lets-eat": {
		text: "text-challenge-3",
		primary: "bg-challenge-3",
		secondary: "bg-challenge-3-light",
		selected: "bg-challenge-3-selected",
		border: "border-challenge-3",
	},
	"cool-corners-of-carnegie": {
		text: "text-challenge-4",
		primary: "bg-challenge-4",
		secondary: "bg-challenge-4-light",
		selected: "bg-challenge-4-selected",
		border: "border-challenge-4",
	},
	"minor-major-general": {
		text: "text-challenge-5",
		primary: "bg-challenge-5",
		secondary: "bg-challenge-5-light",
		selected: "bg-challenge-5-selected",
		border: "border-challenge-5",
	},
	"off-campus-adventures": {
		text: "text-challenge-6",
		primary: "bg-challenge-6",
		secondary: "bg-challenge-6-light",
		selected: "bg-challenge-6-selected",
		border: "border-challenge-6",
	},
} as const;

// Reverse lookups
export const categoryLabels = Object.fromEntries(
	categories.map((c) => [c.id, c.label]),
);

export const categoryRoutes = Object.fromEntries(
	categories.map((c, idx) => [c.id, idx === 0 ? "/" : `/challenges/${idx}`]),
);

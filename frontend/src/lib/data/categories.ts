import { typedFromEntries } from "@/lib/utils";

export const categories = [
	{ id: "all", to: "/", label: "All" },
	{ id: "the-essentials", to: "/challenges/1", label: "The Essentials" },
	{ id: "campus-of-bridges", to: "/challenges/2", label: "Campus of Bridges" },
	{ id: "lets-eat", to: "/challenges/3", label: "Let's Eat!" },
	{
		id: "cool-corners-of-carnegie",
		to: "/challenges/4",
		label: "Cool Corners of Carnegie",
	},
	{
		id: "minor-major-general",
		to: "/challenges/5",
		label: "Minor-Major General",
	},
	{
		id: "off-campus-adventures",
		to: "/challenges/6",
		label: "Off-Campus Adventures",
	},
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type CategoryLabel = (typeof categories)[number]["label"];

// These have to be defined in text, not through interpolation,
// for Tailwind to pick them up
export const colorClasses = {
	all: {
		text: "text-default",
		primary: "bg-default",
		secondary: "bg-default-light",
		selected: "bg-default-selected",
		border: "border-default",
		arcColor: "[--arc-color:theme(colors.default-light)]",
		hover: "bg-default hover:bg-default-hover",
	},
	"the-essentials": {
		text: "text-challenge-1",
		primary: "bg-challenge-1",
		secondary: "bg-challenge-1-light",
		selected: "bg-challenge-1-selected",
		border: "border-challenge-1",
		arcColor: "[--arc-color:theme(colors.challenge-1-light)]",
		hover: "bg-challenge-1 hover:bg-challenge-1-hover",
	},
	"campus-of-bridges": {
		text: "text-challenge-2",
		primary: "bg-challenge-2",
		secondary: "bg-challenge-2-light",
		selected: "bg-challenge-2-selected",
		border: "border-challenge-2",
		arcColor: "[--arc-color:theme(colors.challenge-2-light)]",
		hover: "bg-challenge-2 hover:bg-challenge-2-hover",
	},
	"lets-eat": {
		text: "text-challenge-3",
		primary: "bg-challenge-3",
		secondary: "bg-challenge-3-light",
		selected: "bg-challenge-3-selected",
		border: "border-challenge-3",
		arcColor: "[--arc-color:theme(colors.challenge-3-light)]",
		hover: "bg-challenge-3 hover:bg-challenge-3-hover",
	},
	"cool-corners-of-carnegie": {
		text: "text-challenge-4",
		primary: "bg-challenge-4",
		secondary: "bg-challenge-4-light",
		selected: "bg-challenge-4-selected",
		border: "border-challenge-4",
		arcColor: "[--arc-color:theme(colors.challenge-4-light)]",
		hover: "bg-challenge-4 hover:bg-challenge-4-hover",
	},
	"minor-major-general": {
		text: "text-challenge-5",
		primary: "bg-challenge-5",
		secondary: "bg-challenge-5-light",
		selected: "bg-challenge-5-selected",
		border: "border-challenge-5",
		arcColor: "[--arc-color:theme(colors.challenge-5-light)]",
		hover: "bg-challenge-5 hover:bg-challenge-5-hover",
	},
	"off-campus-adventures": {
		text: "text-challenge-6",
		primary: "bg-challenge-6",
		secondary: "bg-challenge-6-light",
		selected: "bg-challenge-6-selected",
		border: "border-challenge-6",
		arcColor: "[--arc-color:theme(colors.challenge-6-light)]",
		hover: "bg-challenge-6 hover:bg-challenge-6-hover",
	},
} as const;

// Reverse lookups
export const categoryLabelFromId = typedFromEntries(
	categories.map((c) => [c.id, c.label]),
);

export const categoryIdFromLabel = typedFromEntries(
	categories.map((c) => [c.label, c.id]),
);

export const categoryIdFromRoute = Object.fromEntries(
	categories.map((c) => [c.to, c.id]),
);

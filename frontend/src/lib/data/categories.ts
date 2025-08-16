import All from "@/assets/categories/all.svg?react";
import CampusOfBridges from "@/assets/categories/campus-of-bridges.svg?react";
import CoolCornersOfCarnegie from "@/assets/categories/cool-corners-of-carnegie.svg?react";
import LetsEat from "@/assets/categories/lets-eat.svg?react";
import MinorMajorGeneral from "@/assets/categories/minor-major-general.svg?react";
import TheEssentials from "@/assets/categories/the-essentials.svg?react";
import { typedFromEntries } from "@/lib/utils";

// These icons are also listed in the poster component in qr-code-gen
export const categories = [
	{ id: "all", label: "All", Icon: All },
	{
		id: "the-essentials",
		label: "The Essentials",
		Icon: TheEssentials,
	},
	{
		id: "campus-of-bridges",
		label: "Campus of Bridges",
		Icon: CampusOfBridges,
	},
	{ id: "lets-eat", label: "Let's Eat!", Icon: LetsEat },
	{
		id: "cool-corners-of-carnegie",
		label: "Cool Corners of Carnegie",
		Icon: CoolCornersOfCarnegie,
	},
	{
		id: "minor-major-general",
		label: "Minor-Major General",
		Icon: MinorMajorGeneral,
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
		pill: "bg-default-selected text-default-highlight",
	},
	"the-essentials": {
		text: "text-challenge-1",
		primary: "bg-challenge-1",
		secondary: "bg-challenge-1-light",
		selected: "bg-challenge-1-selected",
		border: "border-challenge-1",
		arcColor: "[--arc-color:theme(colors.challenge-1-light)]",
		hover: "bg-challenge-1 hover:bg-challenge-1-hover",
		pill: "bg-challenge-1-selected text-challenge-1-highlight",
	},
	"campus-of-bridges": {
		text: "text-challenge-2",
		primary: "bg-challenge-2",
		secondary: "bg-challenge-2-light",
		selected: "bg-challenge-2-selected",
		border: "border-challenge-2",
		arcColor: "[--arc-color:theme(colors.challenge-2-light)]",
		hover: "bg-challenge-2 hover:bg-challenge-2-hover",
		pill: "bg-challenge-2-selected text-challenge-2-highlight",
	},
	"lets-eat": {
		text: "text-challenge-3",
		primary: "bg-challenge-3",
		secondary: "bg-challenge-3-light",
		selected: "bg-challenge-3-selected",
		border: "border-challenge-3",
		arcColor: "[--arc-color:theme(colors.challenge-3-light)]",
		hover: "bg-challenge-3 hover:bg-challenge-3-hover",
		pill: "bg-challenge-3-selected text-challenge-3-highlight",
	},
	"cool-corners-of-carnegie": {
		text: "text-challenge-4",
		primary: "bg-challenge-4",
		secondary: "bg-challenge-4-light",
		selected: "bg-challenge-4-selected",
		border: "border-challenge-4",
		arcColor: "[--arc-color:theme(colors.challenge-4-light)]",
		hover: "bg-challenge-4 hover:bg-challenge-4-hover",
		pill: "bg-challenge-4-selected text-challenge-4-highlight",
	},
	"minor-major-general": {
		text: "text-challenge-5",
		primary: "bg-challenge-5",
		secondary: "bg-challenge-5-light",
		selected: "bg-challenge-5-selected",
		border: "border-challenge-5",
		arcColor: "[--arc-color:theme(colors.challenge-5-light)]",
		hover: "bg-challenge-5 hover:bg-challenge-5-hover",
		pill: "bg-challenge-5-selected text-challenge-5-highlight",
	},
} as const;

// Reverse lookups
export const categoryLabelFromId = typedFromEntries(
	categories.map((c) => [c.id, c.label]),
);

export const categoryIconFromId = typedFromEntries(
	categories.map((c) => [c.id, c.Icon]),
);

export const categoryIdFromLabel = typedFromEntries(
	categories.map((c) => [c.label, c.id]),
);

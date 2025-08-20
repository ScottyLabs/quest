export const dorms = [
	{
		name: "Morewood Gardens",
		image_path: "/images/dorm-mascots/flower.png",
		group: "Morewood Gardens",
	},
	{
		name: "Morewood E-Tower",
		image_path: "/images/dorm-mascots/pineapple.png",
		group: "Morewood E-Tower",
	},
	{
		name: "Donner",
		image_path: "/images/dorm-mascots/whale.png",
		group: "Donner",
	},
	{
		name: "Stever",
		image_path: "/images/dorm-mascots/stever.png",
		group: "Stever",
	},
	{
		name: "Mudge",
		image_path: "/images/dorm-mascots/fish.png",
		group: "Mudge",
	},
	{
		name: "Res on Fifth",
		image_path: "/images/dorm-mascots/flamingo.png",
		group: "Fifth Avenue/RANCH",
	},
	{
		name: "Whesco",
		image_path: "/images/dorm-mascots/uglypenguin.png",
		group: "WhescoMM",
	},
	{
		name: "Hammerschlag",
		image_path: "/images/dorm-mascots/hedgehog.png",
		group: "HamBaM",
	},
	{
		name: "McGill and Boss",
		image_path: "/images/dorm-mascots/redpanda.png",
		group: "HamBaM",
	},
	{
		name: "The Hill",
		image_path: "/images/dorm-mascots/redpanda.png",
		group: "HamBaM",
	},
	{
		name: "Margaret Morrison",
		image_path: "/images/dorm-mascots/aimagpie.png",
		group: "WhescoMM",
	},
] as const;

export type DormName = (typeof dorms)[number]["name"];
export type DormGroup = (typeof dorms)[number]["group"];

interface ColorSet {
	primary: string;
	light: string;
	text: string;
	selected: string;
	muted: string;
}

export const dormColors: Record<DormGroup, ColorSet> = {
	"Morewood E-Tower": {
		primary: "bg-housing-1",
		light: "bg-housing-1-light",
		text: "text-housing-1-selected",
		selected: "bg-housing-1-selected",
		muted: "bg-housing-1-muted",
	},
	HamBaM: {
		primary: "bg-housing-2",
		light: "bg-housing-2-light",
		text: "text-housing-2-selected",
		selected: "bg-housing-2-selected",
		muted: "bg-housing-2-muted",
	},
	Donner: {
		primary: "bg-housing-3",
		light: "bg-housing-3-light",
		text: "text-housing-3-selected",
		selected: "bg-housing-3-selected",
		muted: "bg-housing-3-muted",
	},
	Stever: {
		primary: "bg-housing-4",
		light: "bg-housing-4-light",
		text: "text-housing-4-selected",
		selected: "bg-housing-4-selected",
		muted: "bg-housing-4-muted",
	},
	Mudge: {
		primary: "bg-housing-5",
		light: "bg-housing-5-light",
		text: "text-housing-5-selected",
		selected: "bg-housing-5-selected",
		muted: "bg-housing-5-muted",
	},
	"Fifth Avenue/RANCH": {
		primary: "bg-housing-6",
		light: "bg-housing-6-light",
		text: "text-housing-6-selected",
		selected: "bg-housing-6-selected",
		muted: "bg-housing-6-muted",
	},
	"Morewood Gardens": {
		primary: "bg-housing-7",
		light: "bg-housing-7-light",
		text: "text-housing-7-selected",
		selected: "bg-housing-7-selected",
		muted: "bg-housing-7-muted",
	},
	WhescoMM: {
		primary: "bg-housing-8",
		light: "bg-housing-8-light",
		text: "text-housing-8-selected",
		selected: "bg-housing-8-selected",
		muted: "bg-housing-8-muted",
	},
};

// Reverse lookups
export const dormGroupFromName: Record<DormName, DormGroup> = dorms.reduce(
	(acc, dorm) => {
		acc[dorm.name] = dorm.group;
		return acc;
	},
	{} as Record<DormName, DormGroup>,
);

export const dormGroups = dorms.reduce(
	(acc, dorm) => {
		const group = dorm.group;
		if (!acc[group]) {
			acc[group] = [];
		}
		acc[group].push({ name: dorm.name, image_path: dorm.image_path });
		return acc;
	},
	{} as Record<DormGroup, { name: DormName; image_path: string }[]>,
);

export const dormImagePaths = dorms.reduce(
	(acc, dorm) => {
		acc[dorm.name] = dorm.image_path;
		return acc;
	},
	{} as Record<string, string>,
);

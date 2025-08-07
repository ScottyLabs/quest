export const dorms = [
	{
		name: "Morewood Gardens",
		image_path: "/images/dorm-mascots/flower.png",
		group: "Morewood",
	},
	{
		name: "Morewood E-Tower",
		image_path: "/images/dorm-mascots/pineapple.png",
		group: "Morewood",
	},
	{
		name: "Donner",
		image_path: "/images/dorm-mascots/whale.png",
		group: "Donner + West Wing",
	},
	{
		name: "West Wing",
		image_path: "/images/dorm-mascots/galaxy.png",
		group: "Donner + West Wing",
	},
	{
		name: "Stever",
		image_path: "/images/dorm-mascots/galaxy.png",
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
		group: "Res on Fifth",
	},
	{
		name: "Whesco",
		image_path: "/images/dorm-mascots/uglypenguin.png",
		group: "The Hill",
	},
	{
		name: "Hammerschlag",
		image_path: "/images/dorm-mascots/hedgehog.png",
		group: "The Hill",
	},
	{
		name: "McGill and Boss",
		image_path: "/images/dorm-mascots/redpanda.png",
		group: "The Hill",
	},
] as const;

// Reverse lookups
export const dormGroups = dorms.reduce(
	(acc, dorm) => {
		const group = dorm.group;
		if (!acc[group]) {
			acc[group] = [];
		}
		acc[group].push(dorm.name);
		return acc;
	},
	{} as Record<string, string[]>,
);

export const dormImagePaths = dorms.reduce(
	(acc, dorm) => {
		acc[dorm.name] = dorm.image_path;
		return acc;
	},
	{} as Record<string, string>,
);

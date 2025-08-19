export const rewardImages = [
    {
		name: "Carnegie Cup Contribution",
		image_path: "/images/trade-rewards/carnegie-cup.svg",
	},
	{
		name: "Free PGH Connections Trip",
		image_path: "/images/trade-rewards/pittsburgh-connection.svg",
	},
	{
		name: "Lunch With MCS Dean",
		image_path: "/images/trade-rewards/MCS-Meal.svg",
	},
	{
		name: "Free Shake Smart",
		image_path: "/images/trade-rewards/shake-smart.svg",
	},
	{
		name: "Rooted In Passion Sticker",
		image_path: "/images/trade-rewards/sticker.svg",
	},
	{
		name: "CMU FYO Shirt",
		image_path: "/images/trade-rewards/FYO-shirt.svg",
	},
	{
		name: "FYO Mug",
		image_path: "/images/trade-rewards/FYO-cup.svg",
	},
	{
		name: "Carnegie Mellon Luggage Tags",
		image_path: "/images/trade-rewards/luggage-tag.svg",
	},
	{
		name: "Carnegie Mellon Magnetic Photo Frame",
		image_path: "/images/trade-rewards/photo-frame.svg",
	},
	{
		name: "Flamingo Pen (Fifth Ave)",
		image_path: "/images/trade-rewards/flamingo.svg",
	},
	{
		name: "Grape Keychains (Mudge)",
		image_path: "/images/trade-rewards/grapes.svg",
	},
    {
		name: "Cactus Eraser (Stever)",
		image_path: "/images/trade-rewards/cactus.svg",
	},
    {
		name: "Rubber Pineapple (E-Tower)",
		image_path: "/images/trade-rewards/pineapple.svg",
	},
    {
		name: "Rubber Whale (Donner)",
		image_path: "/images/trade-rewards/whale.svg",
	},
    {
		name: "Red Wrist Band/Key Holder (Hill)",
		image_path: "/images/trade-rewards/red-bands.svg",
	},
    {
		name: "Penguin Figurines (Whesco)",
		image_path: "/images/trade-rewards/penguin.svg",
	},
    {
		name: "Sunflower Keychains (Gardens)",
		image_path: "/images/trade-rewards/sunflower.svg",
	},
] as const;

// Reverse lookup for reward images
export const rewardImagePaths = rewardImages.reduce(
	(acc, reward) => {
		acc[reward.name] = reward.image_path;
		return acc;
	},
	{} as Record<string, string>,
);

export interface Span {
  text: string;
  strong?: boolean;
}

export type Media =
  | { kind: "image"; src: string; size: number }
  | { kind: "coin" }
  | {
      kind: "offer";
      name: string;
      cost: number;
      claimed: [number, number];
      stock: number;
      art: string;
    }
  | { kind: "claim"; name: string; progress: [number, number] };

export interface Step {
  title: string;
  body: Span[];
  media: Media;
}

export const STEPS: Step[] = [
  {
    title: "Explore Campus",
    body: [
      {
        text:
          "Create Your Own Adventure: Explore with your friends, " +
          "learn about campus life, and take fun photos!",
      },
    ],
    media: { kind: "image", src: "/img/cmu-wordmark.jpg", size: 127 },
  },
  {
    title: "Collect Coins",
    body: [
      { text: "Scotty Coins", strong: true },
      { text: " can be earn through completing task" },
    ],
    media: { kind: "coin" },
  },
  {
    title: "Reap Rewards",
    body: [
      { text: "Trade " },
      { text: "Scotty Coin", strong: true },
      { text: " at the " },
      { text: "Terrier Trade", strong: true },
      { text: " to earn Carnegie Cup points, CMU Merch, and more" },
    ],
    media: {
      kind: "offer",
      name: "Tartan T-Shirt",
      cost: 10,
      claimed: [0, 1],
      stock: 10,
      art: "/img/store/tartan-tshirt.png",
    },
  },
  {
    title: "Claim Rewards",
    body: [
      {
        text:
          "Claim rewards by scanning redeemed QR Codes at " +
          "Community Life Office in Morewood Garden",
        strong: true,
      },
    ],
    media: { kind: "claim", name: "Terrier Scarf", progress: [35, 35] },
  },
];

export const MEDIA_BOX = 163;

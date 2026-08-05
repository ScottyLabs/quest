export interface Span {
  text: string;
  strong?: boolean;
}

export type Media =
  | { kind: "image"; src: string; size: number }
  | { kind: "coin" }
  | { kind: "card"; label: string };

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
    media: { kind: "card", label: "Tartan T-Shirt" },
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
    media: { kind: "card", label: "Terrier Scarf" },
  },
];

export const MEDIA_BOX = 163;

export interface Span {
  text: string;
  strong?: boolean;
}

export type Media =
  | { kind: "image"; src: string; size: number }
  | { kind: "tap" }
  | { kind: "coin" }
  | {
      kind: "offer";
      name: string;
      cost: number;
      claimed: [number, number];
      stock: number;
      art: string;
    }
  | { kind: "claim" }
  | { kind: "gem" }
  | { kind: "cup" };

export interface Step {
  title: string;
  body: Span[];
  media: Media;
}

export const STEPS: Step[] = [
  {
    title: "Explore Campus",
    body: [
      { text: "Create your own adventure", strong: true },
      {
        text:
          " as you discover campus services, major landmarks, hangout " +
          "spots, shortcuts, and more!",
      },
    ],
    media: { kind: "image", src: "/img/cmu-wordmark.jpg", size: 127 },
  },
  {
    title: "Tap",
    body: [
      { text: "From 08/16 6:00 pm through 08/23 6:00 pm, complete " },
      { text: "over 120 Challenges", strong: true },
      {
        text: " throughout Orientation Week by tapping your mobile device at ",
      },
      { text: "Challenge Markers", strong: true },
      { text: " across campus!" },
    ],
    media: { kind: "tap" },
  },
  {
    title: "Collect ScottyCoins",
    body: [
      { text: "Each Challenge you complete grants you " },
      { text: "ScottyCoins", strong: true },
      { text: " that you can exchange for " },
      { text: "prizes!", strong: true },
    ],
    media: { kind: "coin" },
  },
  {
    title: "Earn Prizes",
    body: [
      { text: "Trade " },
      { text: "ScottyCoins", strong: true },
      { text: " at the " },
      { text: "Terrier Trade", strong: true },
      { text: " to claim " },
      { text: "merchandise", strong: true },
      { text: ", " },
      { text: "mementos", strong: true },
      { text: ", and access to " },
      { text: "exclusive experiences!", strong: true },
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
    title: "Claim Your Prizes",
    body: [
      { text: "Present your " },
      { text: "Terrier Ticket", strong: true },
      { text: " at the " },
      { text: "Community Life Office", strong: true },
      { text: " front desk, in Morewood Gardens, " },
      { text: "starting on Tue 08/25", strong: true },
      { text: " to " },
      { text: "redeem your prizes!", strong: true },
    ],
    media: { kind: "claim" },
  },
  {
    title: "Collect Gemstones",
    body: [
      {
        text: "From Mon 08/17 through Fri 08/21, the first 10 Challenges you complete (starting at noon) will each grant you a ",
      },
      { text: "Gemstone", strong: true },
      { text: ", and one daily bonus Challenge will grant " },
      { text: "an additional five Gemstones!", strong: true },
    ],
    media: { kind: "gem" },
  },
  {
    title: "Carnegie Cup Performance",
    body: [
      {
        text: "The greater your housing community's ",
      },
      {
        text: "average Gemstone count",
        strong: true,
      },
      {
        text: " is, ",
      },
      {
        text: "the more Carnegie Cup Points you'll earn!",
        strong: true,
      },
      {
        text: " Gemstone collecting will end on ",
      },
      {
        text: "Fri 08/21 at 8pm.",
        strong: true,
      },
    ],
    media: { kind: "cup" },
  },
];

export const MEDIA_BOX = 163;

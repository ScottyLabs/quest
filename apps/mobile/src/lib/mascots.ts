export type Dorm =
  | "morewood"
  | "etower"
  | "whesco"
  | "mcgillboss"
  | "hammershlag"
  | "donner"
  | "stever"
  | "mudge"
  | "res";

export interface Mascot {
  slug: string;
  dorm: Dorm;
  home: string;
  name: string;
  quote: string;
  credit?: string;
  fill: string;
  edge: string;
  shade: string;
}

export interface House {
  id: string;
  label: string;
  band: string;
  strip: string;
  mascots: Mascot[];
}

export const HOUSES: House[] = [
  {
    id: "morewood",
    label: "Morewood & E-Tower",
    band: "#f4e7d3",
    strip: "#dfdacb",
    mascots: [
      {
        slug: "sunflower",
        dorm: "morewood",
        home: "Morewood",
        name: "Gardens the Sunflower",
        quote: '"What do we need?! Morewood!!"',
        fill: "#ffb22f",
        edge: "#a37505",
        shade: "#9e7105",
      },
      {
        slug: "pineapple",
        dorm: "etower",
        home: "E-Tower",
        name: "Yuxiang the Pineapple",
        quote: '"Who\'s Got The Power?! E-Tower!!"',
        fill: "#ffb22f",
        edge: "#a37505",
        shade: "#9e7105",
      },
    ],
  },
  {
    id: "donner",
    label: "Donner",
    band: "#89c1f5",
    strip: "#dae6f1",
    mascots: [
      {
        slug: "whale",
        dorm: "donner",
        home: "Donner",
        name: "Donner the Whale",
        quote: '"Yeah, Donner!!"',
        fill: "#083372",
        edge: "#022557",
        shade: "#022557",
      },
    ],
  },
  {
    id: "stever",
    label: "Stever",
    band: "#b4f1ca",
    strip: "#c8dbcf",
    mascots: [
      {
        slug: "cactus",
        dorm: "stever",
        home: "Stever",
        name: "Stever the Cactus",
        quote: '"Brrr...It\'s Cold in here... There must be some Stever in the Atmosphere"',
        fill: "#189846",
        edge: "#06794a",
        shade: "#06794a",
      },
    ],
  },
  {
    id: "mudge",
    label: "Mudge",
    band: "#a68fc3",
    strip: "#d5c6e7",
    mascots: [
      {
        slug: "koi",
        dorm: "mudge",
        home: "Mudge",
        name: "Mudge the Koi",
        quote: '"Who\'s house? Mudge House!!"',
        fill: "#caa3e8",
        edge: "#4d2e65",
        shade: "#4d2e65",
      },
    ],
  },
  {
    id: "res-fifth",
    label: "Res on Fifth",
    band: "#efc3ea",
    strip: "#f7e1f4",
    mascots: [
      {
        slug: "flamingo",
        dorm: "res",
        home: "Res on Fifth",
        name: "Ranch the Flamingo",
        quote: '"Party on what ave?! Fifth Ave!!"',
        credit: "~Fifth and Clyde",
        fill: "#e71763",
        edge: "#81133b",
        shade: "#81133b",
      },
    ],
  },
  {
    id: "hill",
    label: "The Hill",
    band: "#c0a4a4",
    strip: "#f2cdcd",
    mascots: [
      {
        slug: "penguin",
        dorm: "whesco",
        home: "Whesco",
        name: "Whesco the Penguin",
        quote: '"Let\'s Go, Whesco!!"',
        credit: "~Henderson, Welch, and Scobell",
        fill: "#94111f",
        edge: "#691418",
        shade: "#691418",
      },
      {
        slug: "redpanda",
        dorm: "mcgillboss",
        home: "Boss, McGill & Maggie Mo",
        name: "Randal Red Panda + Maggie Magpie",
        quote: '"Can I get a Hill Yeah?! Hill Yeah!!"',
        credit: "~Boss, McGill, and Maggie Mo",
        fill: "#d5242c",
        edge: "#691418",
        shade: "#691418",
      },
      {
        slug: "hedgehog",
        dorm: "hammershlag",
        home: "Hammerschlag",
        name: "Penny the HedgeHog",
        quote: '"Can I get a Hill Yeah?! Hill Yeah!!"',
        credit: "~Hammerschlag",
        fill: "#d5242c",
        edge: "#691418",
        shade: "#691418",
      },
    ],
  },
];

export const MASCOTS: Record<string, { mascot: Mascot; house: House }> = Object.fromEntries(
  HOUSES.flatMap((house) => house.mascots.map((mascot) => [mascot.slug, { mascot, house }])),
);

export const ART_BOX = 253;

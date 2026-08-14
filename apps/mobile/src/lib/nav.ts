export type Box = [number, number];

export interface Tab {
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
  box: Box;
  activeBox: Box;
  scrim: boolean;
}

const ACTIVE: Box = [40, 40];

export const TABS: Tab[] = [
  {
    href: "/app/profile",
    label: "Profile",
    icon: "/img/nav/profile.svg",
    activeIcon: "/img/nav/profile-active.svg",
    box: [29, 32],
    activeBox: ACTIVE,
    scrim: false,
  },
  {
    href: "/app/leaderboard",
    label: "Leaderboard",
    icon: "/img/nav/leaderboard.svg",
    activeIcon: "/img/nav/leaderboard-active.svg",
    box: [32, 32],
    activeBox: ACTIVE,
    scrim: false,
  },
  {
    href: "/app",
    label: "Quests",
    icon: "/img/nav/quests.svg",
    activeIcon: "/img/nav/quests-active.svg",
    box: [32, 32],
    activeBox: ACTIVE,
    scrim: true,
  },
  {
    href: "/app/store",
    label: "Store",
    icon: "/img/nav/store.svg",
    activeIcon: "/img/nav/store-active.svg",
    box: [36, 36],
    activeBox: ACTIVE,
    scrim: true,
  },
  {
    href: "/app/info",
    label: "Information",
    icon: "/img/nav/info.svg",
    activeIcon: "/img/nav/info-active.svg",
    box: [33, 33],
    activeBox: ACTIVE,
    scrim: false,
  },
];

export function currentTab(path: string): Tab | null {
  let found: Tab | null = null;

  for (const tab of TABS) {
    if (path !== tab.href && !path.startsWith(`${tab.href}/`)) continue;
    if (found === null || tab.href.length > found.href.length) found = tab;
  }

  return found;
}

export function tabAt(path: string, step: number): string | null {
  const index = TABS.findIndex((tab) => tab.href === path);
  if (index === -1) return null;

  return TABS[index + step]?.href ?? null;
}

export function tabDrift(from: string | null | undefined, to: string | null | undefined): number {
  if (from == null || to == null) return 0;

  const a = TABS.findIndex((tab) => tab.href === from);
  const b = TABS.findIndex((tab) => tab.href === to);
  if (a === -1 || b === -1) return 0;

  return Math.sign(b - a);
}

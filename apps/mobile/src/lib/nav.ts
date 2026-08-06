export type Box = [number, number];

export interface Tab {
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
  box: Box;
  activeBox: Box;
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
  },
  {
    href: "/app/leaderboard",
    label: "Leaderboard",
    icon: "/img/nav/leaderboard.svg",
    activeIcon: "/img/nav/leaderboard-active.svg",
    box: [32, 32],
    activeBox: ACTIVE,
  },
  {
    href: "/app",
    label: "Quests",
    icon: "/img/nav/quests.svg",
    activeIcon: "/img/nav/quests-active.svg",
    box: [32, 32],
    activeBox: ACTIVE,
  },
  {
    href: "/app/store",
    label: "Store",
    icon: "/img/nav/store.svg",
    activeIcon: "/img/nav/store-active.svg",
    box: [36, 36],
    activeBox: ACTIVE,
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

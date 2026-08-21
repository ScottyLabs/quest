import { resolve } from "$app/paths";
import { me } from "$lib/identity.svelte";

export type Section = {
  href: string;
  label: string;
  detail: string;
  visible: () => boolean;
};

export const HOME = resolve("/");
export const CALLBACK = resolve("/callback");

export const SECTIONS: readonly Section[] = [
  {
    href: HOME,
    label: "Overview",
    detail: "Who you are and what you can reach",
    visible: () => true,
  },
  {
    href: resolve("/users"),
    label: "Users",
    detail: "Andrew IDs, dorms and leaderboard visibility",
    visible: () => me.allows("users", "read"),
  },
  {
    href: resolve("/challenges"),
    label: "Challenges",
    detail: "The quest board and its categories",
    visible: () => me.allows("challenge", "read"),
  },
  {
    href: resolve("/cards"),
    label: "Cards",
    detail: "NFC card assignment and placement",
    visible: () => me.allows("challenge_card", "read"),
  },
  {
    href: resolve("/trade"),
    label: "Terrier Trade",
    detail: "Stock, purchases and handovers",
    visible: () => me.can("trade_desk"),
  },
  {
    href: resolve("/uploads"),
    label: "Uploads",
    detail: "Put files on the CDN and copy their URLs",
    visible: () => me.can("assets"),
  },
  {
    href: resolve("/activity"),
    label: "Daily Activity",
    detail: "Taps and gemstone earnings by Quest day",
    visible: () =>
      me.can("data_console") &&
      me.allows("users", "read") &&
      me.allows("tap_events", "read") &&
      me.allows("challenge", "read") &&
      me.allows("daily_challenge", "read"),
  },
  {
    href: resolve("/data"),
    label: "Data",
    detail: "Every table you may reach, row by row",
    visible: () => me.can("data_console"),
  },
  {
    href: resolve("/sql"),
    label: "SQL",
    detail: "Run statements against the database",
    visible: () => me.can("sql_console"),
  },
];

export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  const here = pathname.replace(/\/+$/u, "");
  let best: string | null = null;
  let reach = -1;

  for (const href of hrefs) {
    const target = href.replace(/\/+$/u, "");

    if ((here === target || here.startsWith(`${target}/`)) && target.length > reach) {
      best = href;
      reach = target.length;
    }
  }

  return best;
}

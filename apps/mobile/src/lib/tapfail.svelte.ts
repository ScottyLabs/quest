interface Copy {
  eyebrow: string;
  title: string;
  body: string;
  hint?: string;
  retry?: boolean;
}

export interface TapFail extends Copy {
  code: string;
  url: string | null;
}

const COPY: Record<string, Copy> = {
  tap_signature: {
    eyebrow: "Poster rejected",
    title: "That poster didn't check out",
    body: "Its signature didn't match, so the tap can't be counted. The poster may be damaged, or it may not be an official Orientation Quest poster.",
    hint: "Found it on an official challenge sign? Fill a report on the info page or let your OC know.",
  },
  tap_url_malformed: {
    eyebrow: "Poster rejected",
    title: "That isn't a Orientation Quest poster",
    body: "The link on that poster isn't an Orientation Quest link. Look for the official poster at the challenge location.",
  },
  tap_body_invalid: {
    eyebrow: "Tap lost",
    title: "That tap got garbled",
    body: "We couldn't read what your phone sent. Nothing was counted, so the poster is still good for another go.",
    retry: true,
  },
  card_unassigned: {
    eyebrow: "Not live yet",
    title: "This poster isn't in play",
    body: "The poster is genuine, but no challenge is linked to it yet. Try again later!",
  },
  card_retired: {
    eyebrow: "Retired poster",
    title: "This poster is out of service",
    body: "It was decomissioned and no longer counts. Check the challenge location for its replacement.",
  },
  card_locked: {
    eyebrow: "Not open yet",
    title: "This challenge hasn't started",
    body: "The tag is real, but this challenge unlocks later. You can find it in locked challenges on the app.",
  },
  tap_out_of_range: {
    eyebrow: "Too far away",
    title: "You're not there yet",
    body: "Taps only count at the challenge itself. Head to the location, then tap the poster again.",
    retry: true,
  },
  tap_replayed: {
    eyebrow: "Already counted",
    title: "That tap was already used",
    body: "You are trying to use a replayed card tap, the same tap can't count twice.",
    hint: "If you're trying to cheat, tough luck!",
  },
  challenge_row_missing: {
    eyebrow: "Our fault",
    title: "Something's off on our end",
    body: "Please go to the info tab and file a report if this is a genuine challenge.",
    retry: true,
  },
};

const FALLBACK: Copy = {
  eyebrow: "Tap failed",
  title: "Couldn't register that tap",
  body: "Something went wrong on the way. Nothing was counted, so try tapping the poster again.",
  retry: true,
};

export const tapfail = $state<{ current: TapFail | null }>({ current: null });

export function showTapFail(code: string, url: string | null = null): void {
  tapfail.current = { ...(COPY[code] ?? FALLBACK), code, url };
}

export function closeTapFail(): void {
  tapfail.current = null;
}

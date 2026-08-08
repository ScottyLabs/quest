import { App } from "@capacitor/app";

const HOST = "cmu.quest";
const SCHEME = "org.scottylabs.quest";

function isTap(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.search === "") return false;
    if (url.protocol === "https:") return url.hostname === HOST && url.pathname === "/tap";
    return url.protocol === `${SCHEME}:` && url.hostname === "tap";
  } catch {
    return false;
  }
}

let last: string | null = null;

export async function watchTaps(handle: (url: string) => void): Promise<() => void> {
  const deliver = (url: string | null | undefined) => {
    if (typeof url !== "string" || !isTap(url) || url === last) return;
    last = url;
    handle(url);
  };

  const launch = await App.getLaunchUrl().catch(() => null);
  const listener = await App.addListener("appUrlOpen", ({ url }) => deliver(url));
  deliver(launch?.url);

  return () => void listener.remove();
}

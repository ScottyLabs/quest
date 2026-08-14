import { App } from "@capacitor/app";
import { session } from "./session.svelte";

let last: string | null = null;

export async function watchCallbacks(): Promise<() => void> {
  const deliver = (url: string | null | undefined) => {
    if (typeof url !== "string" || url === last) return;
    last = url;
    void session.adoptCallback(url);
  };

  const launch = await App.getLaunchUrl().catch(() => null);
  const listener = await App.addListener("appUrlOpen", ({ url }) => deliver(url));
  deliver(launch?.url);

  return () => void listener.remove();
}

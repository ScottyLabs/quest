import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return await Browser.open({ url });
  globalThis.open(url, "_blank");
}

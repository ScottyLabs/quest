import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  globalThis.open(url, "_blank");
}

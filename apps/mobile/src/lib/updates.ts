import { CapacitorUpdater } from "@capgo/capacitor-updater";

export async function ready(): Promise<void> {
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (error) {
    console.error("updates", error);
  }
}

import { CapacitorUpdater } from "@capgo/capacitor-updater";

export async function ready(): Promise<void> {
  try {
    await CapacitorUpdater.notifyAppReady();
    await apply();
  } catch (error) {
    console.error("updates", error);
  }
}

/**
 * Activate a bundle that finished downloading in an earlier session. Without this the
 * plugin waits for another background/foreground cycle, so a download landed on one
 * launch only became visible two launches later.
 */
async function apply(): Promise<void> {
  const [{ bundle }, { bundles }] = await Promise.all([
    CapacitorUpdater.current(),
    CapacitorUpdater.list(),
  ]);

  const waiting = bundles.find(
    (entry) =>
      entry.status === "pending" && entry.id !== bundle.id && entry.version !== bundle.version,
  );

  if (waiting) await CapacitorUpdater.set({ id: waiting.id });
}

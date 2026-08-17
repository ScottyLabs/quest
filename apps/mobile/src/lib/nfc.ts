import { Capacitor, type PluginListenerHandle, registerPlugin } from "@capacitor/core";
import type { NdefRecord, NfcSessionEndEvent } from "@capgo/capacitor-nfc";
import { CapacitorNfc, type StartScanningOptions } from "@capgo/capacitor-nfc";

interface QuestNfcEvent {
  ndefMessage: NdefRecord[];
}

interface QuestNfcPlugin {
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;

  addListener(
    eventName: "ndef",
    listener: (event: QuestNfcEvent) => void,
  ): Promise<PluginListenerHandle>;
}

const QuestNfc = registerPlugin<QuestNfcPlugin>("QuestNfc");

export class NfcError extends Error {}

export type Readiness = "ready" | "disabled" | "unsupported";

export const showsSystemSheet = Capacitor.getPlatform() === "ios";

const PREFIXES: Record<number, string> = {
  0x00: "",
  0x01: "http://www.",
  0x02: "https://www.",
  0x03: "http://",
  0x04: "https://",
};

const URI_TYPE = 0x55;
const TNF_WELL_KNOWN = 1;
const TNF_ABSOLUTE_URI = 3;

export async function readiness(): Promise<Readiness> {
  if (!Capacitor.isNativePlatform()) return "unsupported";

  try {
    if (!(await CapacitorNfc.isSupported()).supported) return "unsupported";
    return (await CapacitorNfc.getStatus()).status === "NFC_OK" ? "ready" : "disabled";
  } catch {
    return "unsupported";
  }
}

function decode(record: NdefRecord): string | null {
  const bytes = record.payload;
  if (!Array.isArray(bytes) || bytes.length === 0) return null;

  const text = (from: number) => new TextDecoder().decode(new Uint8Array(bytes.slice(from)));

  if (record.tnf === TNF_ABSOLUTE_URI) return text(0);

  if (record.tnf === TNF_WELL_KNOWN && record.type?.[0] === URI_TYPE) {
    return (PREFIXES[bytes[0] ?? 0] ?? "") + text(1);
  }

  return null;
}

function tapUrl(records: NdefRecord[] | null | undefined): string | null {
  for (const record of records ?? []) {
    const url = decode(record);
    if (url !== null && url.includes("?") && url.includes("e=")) return url;
  }

  return null;
}

type Waiter = { resolve: (url: string | null) => void; reject: (error: unknown) => void };

const onAndroid = () => Capacitor.getPlatform() === "android";

async function startScanning(options: StartScanningOptions): Promise<void> {
  if (onAndroid()) {
    await QuestNfc.startScanning();
    return;
  }

  await CapacitorNfc.startScanning(options);
}

async function stopScanning(): Promise<void> {
  if (onAndroid()) {
    await QuestNfc.stopScanning();
    return;
  }

  await CapacitorNfc.stopScanning();
}

let ambient: ((url: string) => void) | null = null;
let waiter: Waiter | null = null;
let armed = false;
let mounted: Promise<void> | null = null;
let sessionOpen = false;
let closed: (() => void) | null = null;

function deliver(url: string | null): void {
  const pending = waiter;
  waiter = null;

  if (pending) {
    if (url === null) pending.reject(new NfcError("Please scan a valid Orientation Quest poster"));
    else pending.resolve(url);
    return;
  }

  if (url !== null) ambient?.(url);
}

function ended(reason: NfcSessionEndEvent["reason"]): void {
  sessionOpen = false;
  closed?.();
  closed = null;

  const pending = waiter;
  waiter = null;
  if (pending === null) return;

  if (reason === "sessionTimeout") pending.reject(new NfcError("Scan timed out."));
  else pending.resolve(null);
}

async function settle(): Promise<void> {
  if (!showsSystemSheet) return;

  if (sessionOpen) {
    const { promise, resolve } = Promise.withResolvers<void>();
    closed = resolve;
    const timer = setTimeout(resolve, 2500);

    try {
      await promise;
    } finally {
      clearTimeout(timer);
      closed = null;
    }
  }

  await new Promise<void>((done) => {
    setTimeout(done, 350);
  });
}

function listen(): Promise<void> {
  mounted ??= (async () => {
    if (!Capacitor.isNativePlatform()) return;

    await CapacitorNfc.addListener("nfcEvent", (event) => {
      deliver(tapUrl(event.tag.ndefMessage));
    });

    await CapacitorNfc.addListener("nfcSessionEnd", ({ reason }) => {
      ended(reason);
    });

    /*
     * In foreground reader mode, Android Quest scans come
     * through our raw ISO-DEP implementation instead.
     */
    if (onAndroid()) {
      await QuestNfc.addListener("ndef", ({ ndefMessage }) => {
        deliver(tapUrl(ndefMessage));
      });
    }
  })();

  return mounted;
}

const IOS_TAG_SESSION: StartScanningOptions = {
  invalidateAfterFirstRead: true,
  iosSessionType: "tag",
  iosPollingOptions: ["iso14443"],
};

export async function arm(handler: (url: string) => void): Promise<() => void> {
  ambient = handler;
  await listen();

  if (!onAndroid() || armed) {
    return () => {
      ambient = null;
    };
  }

  await startScanning({
    invalidateAfterFirstRead: false,
  });
  armed = true;

  return () => {
    ambient = null;
    armed = false;
    void stopScanning().catch(() => null);
  };
}

export async function scan(prompt: string, signal?: AbortSignal): Promise<string | null> {
  await listen();
  if (signal?.aborted === true) return null;

  const { promise, resolve, reject } = Promise.withResolvers<string | null>();
  const mine: Waiter = { resolve, reject };
  const cancel = () => {
    if (waiter === mine) waiter = null;
    resolve(null);
  };
  signal?.addEventListener("abort", cancel, { once: true });

  try {
    if (!armed) {
      try {
        await startScanning({
          alertMessage: prompt,
          ...IOS_TAG_SESSION,
        });
      } catch {
        await new Promise<void>((done) => {
          setTimeout(done, 400);
        });
        try {
          await startScanning({
            alertMessage: prompt,
            ...IOS_TAG_SESSION,
          });
        } catch {
          throw new NfcError("The scanner is still closing. Try that again.");
        }
      }
      sessionOpen = true;
    }

    waiter = mine;

    return await promise;
  } finally {
    signal?.removeEventListener("abort", cancel);
    if (waiter === mine) waiter = null;
    if (!armed) {
      await stopScanning().catch(() => null);
      await settle();
      sessionOpen = false;
      closed = null;
    }
  }
}

export async function openSettings(): Promise<void> {
  await CapacitorNfc.showSettings().catch(() => null);
}

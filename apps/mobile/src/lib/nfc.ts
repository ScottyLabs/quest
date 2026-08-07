import { Capacitor } from "@capacitor/core";
import { CapacitorNfc } from "@capgo/capacitor-nfc";
import type { NdefRecord } from "@capgo/capacitor-nfc";

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

type Waiter = { resolve: (url: string) => void; reject: (error: unknown) => void };

const onAndroid = () => Capacitor.getPlatform() === "android";

let ambient: ((url: string) => void) | null = null;
let waiter: Waiter | null = null;
let armed = false;

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

export async function arm(handler: (url: string) => void): Promise<() => void> {
  ambient = handler;
  if (!onAndroid() || armed) {
    return () => {
      ambient = null;
    };
  }

  const tag = await CapacitorNfc.addListener("nfcEvent", (event) => {
    deliver(tapUrl(event.tag.ndefMessage));
  });
  await CapacitorNfc.startScanning({ invalidateAfterFirstRead: false });
  armed = true;

  return () => {
    ambient = null;
    armed = false;
    void tag.remove();
    void CapacitorNfc.stopScanning().catch(() => undefined);
  };
}

export async function scan(prompt: string, signal?: AbortSignal): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const cancel = () => {
    waiter = null;
    reject(new NfcError("Scan cancelled."));
  };
  signal?.addEventListener("abort", cancel, { once: true });

  if (armed) {
    waiter = { resolve, reject };
    try {
      return await promise;
    } finally {
      signal?.removeEventListener("abort", cancel);
      waiter = null;
    }
  }

  const tag = await CapacitorNfc.addListener("nfcEvent", (event) => {
    const url = tapUrl(event.tag.ndefMessage);
    if (url === null) reject(new NfcError("Please scan a valid Orientation Quest poster"));
    else resolve(url);
  });

  const ended = await CapacitorNfc.addListener("nfcSessionEnd", ({ reason }) => {
    reject(new NfcError(reason === "sessionTimeout" ? "Scan timed out." : "Scan cancelled."));
  });

  try {
    await CapacitorNfc.startScanning({ alertMessage: prompt, invalidateAfterFirstRead: true });
    return await promise;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await tag.remove();
    await ended.remove();
    await CapacitorNfc.stopScanning().catch(() => undefined);
  }
}

export async function openSettings(): Promise<void> {
  await CapacitorNfc.showSettings().catch(() => undefined);
}

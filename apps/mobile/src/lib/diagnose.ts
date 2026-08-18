import { devicePublicKey } from "$lib/auth";
import { fix } from "$lib/geo";
import { Capacitor } from "@capacitor/core";
import { CryptoApi } from "@perfood/capacitor-crypto-api";

const TAG = "org.scottylabs.quest.device";

export interface Diagnosis {
  nativePlatform: boolean;
  platform: string;
  pluginRegistered: boolean;
  generateKey: string;
  publicKey: string;
  sign: string;
  location: string;
}

function pluginRegistered(name: string): boolean {
  const root: unknown = globalThis;

  if (!(typeof root === "object" && root !== null && "Capacitor" in root)) {
    return false;
  }

  const capacitor: unknown = root.Capacitor;

  if (!(typeof capacitor === "object" && capacitor !== null && "Plugins" in capacitor)) {
    return false;
  }

  const plugins: unknown = capacitor.Plugins;

  return typeof plugins === "object" && plugins !== null && name in plugins;
}

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export async function diagnose(): Promise<Diagnosis> {
  const result: Diagnosis = {
    nativePlatform: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    pluginRegistered: pluginRegistered("CryptoApi"),
    generateKey: "not attempted",
    publicKey: "not attempted",
    sign: "not attempted",
    location: "not attempted",
  };

  try {
    const { publicKey } = await CryptoApi.generateKey({ tag: TAG, algorithm: "ecdsa" });
    result.generateKey =
      typeof publicKey === "string" && publicKey.length > 0
        ? `ok, ${publicKey.length} chars`
        : "ok but empty publicKey";
  } catch (error) {
    result.generateKey = reason(error);
  }

  try {
    result.publicKey = `ok, ${(await devicePublicKey()).length} chars`;
  } catch (error) {
    result.publicKey = reason(error);
  }

  try {
    const { signature } = await CryptoApi.sign({ tag: TAG, data: "quest-device-login:test" });
    result.sign =
      typeof signature === "string" && signature.length > 0
        ? `ok, ${signature.replaceAll(/\s/gu, "").length} chars`
        : "empty";
  } catch (error) {
    result.sign = reason(error);
  }

  const where = await fix();

  result.location =
    where.lat !== undefined && where.lon !== undefined
      ? `${where.lat.toFixed(5)}, ${where.lon.toFixed(5)} ±${where.accuracy ?? "?"}m`
      : "unavailable";

  return result;
}

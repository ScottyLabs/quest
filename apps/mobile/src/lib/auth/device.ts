import { CryptoApi } from "@perfood/capacitor-crypto-api";
import { AuthError } from "./types";

const KEY_TAG = "org.scottylabs.quest.device";

const utf8 = new TextEncoder();

function hex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const unwrap = (value: string | undefined): string => value?.replace(/\s/gu, "") ?? "";

async function load(): Promise<string> {
  const { publicKey } = await CryptoApi.generateKey({ tag: KEY_TAG, algorithm: "ecdsa" });
  const spki = decodeBase64(unwrap(publicKey));

  const start = spki.length - 65;
  if (start < 0 || spki[start] !== 0x04) {
    throw new AuthError("device_unverified", `keystore returned ${spki.length} spki bytes`);
  }

  return hex(spki.subarray(start));
}

let cached: Promise<string> | null = null;

export function devicePublicKey(): Promise<string> {
  cached ??= load().catch((error: unknown) => {
    cached = null;
    throw error;
  });

  return cached;
}

async function sign(message: string): Promise<Uint8Array> {
  const { signature } = await CryptoApi.sign({ tag: KEY_TAG, data: message });

  const encoded = unwrap(signature);
  if (encoded.length === 0) {
    throw new AuthError("device_unverified", "keystore refused to sign");
  }

  return decodeBase64(encoded);
}

export async function signChallenge(nonce: string): Promise<string> {
  return base64url(await sign(`quest-device-login:${nonce}`));
}

export async function signMessage(message: string): Promise<string> {
  return base64url(await sign(message));
}

/** Per-request proof: an ES256 JWT the middleware matches to the session. */
export async function deviceProof(method: string, url: string): Promise<string> {
  const part = (value: unknown): string => base64url(utf8.encode(JSON.stringify(value)));
  const target = new URL(url);

  const signed = [
    part({ alg: "ES256", typ: "quest-proof+jwt" }),
    part({
      pk: await devicePublicKey(),
      htm: method.toUpperCase(),
      htu: `${target.origin}${target.pathname}`,
      iat: Math.floor(Date.now() / 1000),
      jti: hex(crypto.getRandomValues(new Uint8Array(16))),
    }),
  ].join(".");

  return `${signed}.${base64url(await sign(signed))}`;
}

import { CapacitorPassToWallet } from "@belongnet/capacitor-pass-to-wallet";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { api } from "$lib/api/client";
import { signMessage } from "$lib/auth/device";

export interface WalletPass {
  serial: string;
  token: string;
  fresh: boolean;
  digest: string;
  bytes: Blob;
}

async function reason(error: unknown, response: Response): Promise<string> {
  if (error instanceof Blob) {
    try {
      const body: unknown = JSON.parse(await error.text());
      if (body !== null && typeof body === "object" && "error" in body) {
        const code = body.error;
        if (typeof code === "string") return code;
      }
    } catch {}
  }
  return `http_${response.status}`;
}

export async function applePass(): Promise<WalletPass> {
  const {
    data: challenge,
    error: refused,
    response: asked,
  } = await api.GET("/api/passes/apple/challenge");
  if (!challenge) throw new Error(refused?.error ?? `http_${asked.status}`);

  const signature = await signMessage(challenge.message);

  const { data, error, response } = await api.POST("/api/passes/apple", {
    body: { issued_at: challenge.issued_at, signature },
    parseAs: "blob",
  });
  if (!response.ok || !data) throw new Error(await reason(error, response));

  return {
    serial: response.headers.get("x-pass-serial") ?? challenge.andrew_id,
    token: response.headers.get("x-pass-token") ?? "",
    fresh: response.headers.get("x-pass-issued") === "new",
    digest: response.headers.get("x-pass-sha256") ?? "",
    bytes: data,
  };
}

export async function passToken(): Promise<string> {
  const {
    data: challenge,
    error: refused,
    response: asked,
  } = await api.GET("/api/passes/apple/challenge");
  if (!challenge) throw new Error(refused?.error ?? `http_${asked.status}`);

  const signature = await signMessage(challenge.message);

  const { data, error, response } = await api.POST("/api/passes/token", {
    body: { issued_at: challenge.issued_at, signature },
  });
  if (!data) throw new Error(error?.error ?? `http_${response.status}`);

  return data.token;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 8192) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  }
  return btoa(binary);
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const out = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(out)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function decode(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let at = 0; at < binary.length; at += 1) out[at] = binary.charCodeAt(at);
  return out;
}

export async function addAppleToWallet(): Promise<void> {
  const pass = await applePass();
  const bytes = new Uint8Array(await pass.bytes.arrayBuffer());

  if (pass.digest === "") throw new Error("pass_digest_header_missing");

  const fetched = await sha256(bytes);
  if (fetched !== pass.digest) {
    throw new Error(
      `pass_corrupt_in_transit ${bytes.length}B ${fetched.slice(0, 12)} != ${pass.digest.slice(0, 12)}`,
    );
  }

  const path = `${pass.serial}.pkpass`;
  await Filesystem.writeFile({ path, data: base64(bytes), directory: Directory.Cache });

  const { data: written } = await Filesystem.readFile({ path, directory: Directory.Cache });
  const onDisk = typeof written === "string" ? decode(written) : new Uint8Array();
  const stored = await sha256(onDisk);
  if (stored !== pass.digest) {
    throw new Error(
      `pass_corrupt_on_disk ${onDisk.length}B ${stored.slice(0, 12)} != ${pass.digest.slice(0, 12)}`,
    );
  }

  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  await CapacitorPassToWallet.addToWallet({ filePath: uri });
}

export async function verifyPass(token: string) {
  const { data, error } = await api.POST("/api/passes/verify", { body: { token } });
  if (!data) throw new Error(error?.error ?? "pass_unverified");
  return data;
}

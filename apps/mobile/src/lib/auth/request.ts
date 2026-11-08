import { enrollDevice, responseError, signed } from "./api";
import { session } from "./session.svelte";
import { AuthError } from "./types";

export async function authRequest(request: Request): Promise<Response> {
  const retryable = request.clone();
  const response = await signed(request, session.id);
  if (response.status !== 401) return response;

  if (await enrollDevice(session.id).catch(() => false)) {
    const retried = await signed(retryable, session.id);
    if (retried.status !== 401) return retried;
  }

  const code = await responseError(response);
  session.clear();
  throw new AuthError(code === "unknown" ? "unauthorized" : code);
}

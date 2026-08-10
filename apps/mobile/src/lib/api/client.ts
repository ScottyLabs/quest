import createClient from "openapi-fetch";
import { apiBase, authRequest } from "$lib/auth";
import type { paths } from "./schema";

export const api = createClient<paths>({ baseUrl: apiBase, fetch: authRequest });

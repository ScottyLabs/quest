import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";

import type { paths } from "./schema.gen";

interface FetchClientOptions {
    baseUrl: string;
    credentials?: "include" | "omit" | "same-origin";
}

function createQueryClient({
    baseUrl,
    credentials = "include",
}: FetchClientOptions) {
    const fetchClient = createFetchClient<paths>({
        baseUrl,
        credentials,
    });

    return createClient(fetchClient);
}

export function createGatewayClient(baseUrl: string, client: string) {
    async function logout() {
        const logoutUrl = `${baseUrl}/logout`;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = logoutUrl;

        document.body.appendChild(form);
        form.submit();
    }

    async function login() {
        const loginUrl = `${baseUrl}/oauth2/authorization/${client}?redirect_uri=${encodeURIComponent(window.location.href)}`;
        window.location.href = loginUrl;
    }

    return {
        $api: createQueryClient({ baseUrl }),
        logout,
        login,
    };
}

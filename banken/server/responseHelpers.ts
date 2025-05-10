import { HttpRequest } from "./wrapper.ts";

export class ResponseHelpers {
    constructor(private req: HttpRequest) {}
    private headers: HeadersInit | undefined;

    redirect(url: string): Response {
        return new Response(null, {
            status: 302,
            headers: {
                ...this.headers,
                location: url,
            },
        });
    }

    redirectWithError(
        errorCode: string,
        additionalParams: Record<string, string> = {}
    ): Response {
        const url = new URL("/login", this.req.url.origin);
        url.searchParams.set("error", errorCode);

        // Preserve original redirect if present
        if (this.req.url.searchParams.has("redirect")) {
            url.searchParams.set(
                "redirect",
                this.req.url.searchParams.get("redirect")!
            );
        }

        // Add any additional parameters
        for (const [key, value] of Object.entries(additionalParams)) {
            url.searchParams.set(key, value);
        }

        return this.redirect(url.toString());
    }

    json(data: unknown, status = 200, headers?: HeadersInit): Response {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        });
    }

    setCookies(cookies: Record<string, string>): ResponseHelpers {
        const headerEntries = Object.entries(cookies).map(
            ([name, value]) =>
                `${name}=${value}; HttpOnly; Secure; Path=/; SameSite=Strict`
        );

        this.headers = headerEntries.map((cookie) => ["Set-Cookie", cookie]);
        return this;
    }
}

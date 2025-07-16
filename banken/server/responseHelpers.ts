import { Http, HttpRequest } from "./wrapper.ts";

export class ResponseHelpers {
    private headers: Headers;

    constructor(private req: HttpRequest) {
        this.headers = new Headers();
    }

    redirect(url: string): Response {
        this.headers.set("Location", url);

        return new Response(null, {
            status: 302,
            headers: this.headers,
        });
    }

    redirectWithError(
        errorCode: string,
        additionalParams: Record<string, string> = {}
    ): Response {
        const url = new URL("/", this.req.url.origin);
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

    setCookies(
        cookies: Record<
            string,
            string | { value: string; options?: CookieOptions }
        >
    ): ResponseHelpers {
        Object.entries(cookies).map(([name, cookie]) => {
            const value = typeof cookie === "string" ? cookie : cookie.value;
            const options =
                typeof cookie === "string" ? {} : cookie.options || {};

            // Default options
            const defaultOptions = {
                httpOnly: true,
                secure: Http.env["DENO_ENV"] === "production",
                path: "/",
                sameSite: "Lax" as const,
                maxAge: 86400, // 1 day
                domain: Http.env["DOMAIN"],
            };

            // Merge user options with defaults
            const mergedOptions = { ...defaultOptions, ...options };

            // Build the cookie string
            let cookieStr = `${name}=${value}`;

            // Special handling for maxAge (converts to Max-Age)
            if (mergedOptions.maxAge !== undefined) {
                cookieStr += `; Max-Age=${mergedOptions.maxAge}`;
            }

            // Standard attributes
            if (mergedOptions.path) {
                cookieStr += `; Path=${mergedOptions.path}`;
            }
            if (mergedOptions.domain) {
                cookieStr += `; Domain=${mergedOptions.domain}`;
            }
            if (mergedOptions.secure) {
                cookieStr += "; Secure";
            }
            if (mergedOptions.httpOnly) {
                cookieStr += "; HttpOnly";
            }
            if (mergedOptions.sameSite) {
                cookieStr += `; SameSite=${mergedOptions.sameSite}`;
            }

            console.log(cookieStr);
            this.headers.append("set-cookie", cookieStr + ",");
        });

        return this;
    }
}

interface CookieOptions {
    /**
     * Cookie expiration in seconds (e.g., `86400` = 1 day).
     * Sets `Max-Age` (preferred) or `Expires` (fallback).
     */
    maxAge?: number;

    /**
     * Domain where the cookie is accessible.
     * Example: `.example.com` (all subdomains) or `api.example.com`.
     */
    domain?: string;

    /**
     * Path where the cookie is valid (default: `/` for entire site).
     */
    path?: string;

    /**
     * If `true`, the cookie is only sent over HTTPS.
     * Required for `SameSite=None`.
     */
    secure?: boolean;

    /**
     * If `true`, JavaScript cannot access the cookie (`document.cookie`).
     * Recommended for auth cookies.
     */
    httpOnly?: boolean;

    /**
     * CSRF protection:
     * - `Strict`: Cookie only sent on same-site requests.
     * - `Lax`: Cookie sent with top-level navigation (default for most browsers).
     * - `None`: Cookie sent cross-site (requires `Secure`).
     */
    sameSite?: "Strict" | "Lax" | "None";

    /**
     * Legacy `Expires` date (use `maxAge` for simpler usage).
     */
    expires?: Date;
}

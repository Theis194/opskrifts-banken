import { serveFile } from "https://deno.land/std@0.192.0/http/file_server.ts";
import { load } from "https://deno.land/std/dotenv/mod.ts";
import { Client } from "jsr:@db/postgres";
import { Eta } from "https://deno.land/x/eta@v3.5.0/src/index.ts";
import {
    generateRefreshToken,
    generateToken,
    verifyRefreshToken,
    verifyToken,
} from "../jwt/jwt.ts";
import {
    hasRessourcePermission,
    Permission,
    Ressource,
    Role,
} from "../acm/permission.ts";
import { SafeUser } from "../db/user-db.ts";
import { ResponseHelpers } from "./responseHelpers.ts";

type HttpMethods = "GET" | "POST" | "PUT" | "DELETE";

export type QueryParams = Record<string, string | string[]>;
export type FormDataParams = Record<string, unknown>;

export interface HttpRequest {
    request: Request;
    user?: SafeUser;
    params: QueryParams;
    formData?: FormDataParams;
    cookies: Record<string, string>;
    url: URL;
    res: ResponseHelpers;
}

type Handler = (ctx: HttpRequest) => Promise<Response>;

export class Http {
    handlers: Record<HttpMethods, Record<string, Handler>>;
    staticDir: string;
    static client: Client;
    static eta: Eta;

    constructor(staticDir: string, client: Client, eta: Eta) {
        this.handlers = {
            GET: {},
            POST: {},
            PUT: {},
            DELETE: {},
        };
        this.staticDir = staticDir;

        Http.client = client;
        Http.eta = eta;
    }

    static async create(staticDir: string): Promise<Http> {
        const env = await load();

        const dbPassword = Deno.env.get("DB_PASSWORD") || env["DB_PASSWORD"];
        const dbUser = Deno.env.get("DB_USER") || env["DB_USER"];
        const hostname = Deno.env.get("DB_HOSTNAME") || env["DB_HOSTNAME"];

        const client = new Client({
            user: dbUser,
            password: dbPassword,
            database: "banken",
            hostname: hostname,
            port: 5432,
        });

        const eta = new Eta({ views: `${staticDir}/views` });

        return new Http(staticDir, client, eta);
    }

    addRoute(
        method: HttpMethods,
        path: string,
        handler: Handler,
        options: {
            requireAuth?: boolean;
            acm?: {
                resource: Ressource;
                permission: Permission;
            };
        } = { requireAuth: true }
    ): Http {
        this.handlers[method][path] = async (ctx: HttpRequest) => {
            // Always run auth middleware to get user if available
            const authResult = await Http.authMiddleware(ctx.request);
            if (authResult.user) {
                ctx.user = authResult.user;
            }

            // If auth is required but no user exists
            if (options.requireAuth && !ctx.user) {
                return (
                    authResult.response ||
                    new Response("Unauthorized", { status: 401 })
                );
            }

            // If user exists and ACM permissions are required
            if (ctx.user && options.acm) {
                if (
                    !hasRessourcePermission(
                        ctx.user.role,
                        options.acm.resource,
                        options.acm.permission
                    )
                ) {
                    return new Response("Forbidden", { status: 403 });
                }
            }

            return handler(ctx);
        };
        return this;
    }

    static async serveStaticFile(
        req: Request,
        filePath: string
    ): Promise<Response> {
        try {
            const response = await serveFile(req, filePath);
            console.log("File served successfully:", filePath);
            return response;
        } catch (error) {
            console.error("Error serving file.", error);
            return new Response("404 Not Found", { status: 404 });
        }
    }

    static renderTemplate(
        template: string,
        data: Record<string, unknown> = {}
    ): Response {
        const rendered = this.eta.render(template, data);
        return new Response(rendered, {
            headers: { "Content-Type": "text/html" },
        });
    }

    static parseCookie(req: Request): Record<string, string> {
        const cookies: Record<string, string> = {};
        const cookieHeader = req.headers.get("Cookie");
        if (cookieHeader) {
            cookieHeader.split(";").forEach((cookie) => {
                const [name, value] = cookie.trim().split("=");
                cookies[name] = value;
            });
        }

        return cookies;
    }

    static async authMiddleware(req: Request): Promise<{
        user: { email: string; username: string; role: Role, id: number } | null;
        response?: Response;
    }> {
        const cookies = this.parseCookie(req);
        const token = cookies.jwt;
        const refreshToken = cookies.refreshToken;
        const url = new URL(req.url);

        if (token) {
            try {
                const payload = verifyToken(token);
                return { user: payload };
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name === "TokenExpiredError" &&
                    refreshToken
                ) {
                    try {
                        const refreshPayload = verifyRefreshToken(refreshToken);
                        const newToken = generateToken(refreshPayload);
                        const newRefreshToken =
                            generateRefreshToken(refreshPayload);

                        const headers = {
                            "Set-Cookie": `jwt=${newToken}; Path=/; Secure; HttpOnly, refreshToken=${newRefreshToken}; Path=/; Secure; HttpOnly`,
                        };

                        const response = this.redirect(url, headers);

                        return { user: refreshPayload, response };
                    } catch (refreshError) {
                        console.error("Invalid refresh token:", refreshError);
                        return { user: null, response: this.redirect(url) };
                    }
                }
                console.error("Invalid token:", error);
                return { user: null, response: this.redirect(url) };
            }
        }

        return { user: null, response: this.redirect(url) };
    }

    static redirect(url: URL, headers?: HeadersInit): Response {
        const redirectUrl = `${url.origin}/?redirect=${encodeURIComponent(
            url.pathname
        )}`;
        return new Response(null, {
            status: 302,
            headers: {
                ...headers,
                location: redirectUrl,
            },
        });
    }

    static parseQueryParams(url: URL): QueryParams {
        const params: QueryParams = {};
        url.searchParams.forEach((value, key) => {
            if (params[key]) {
                // If the key already exists, convert to array or push to existing array
                if (Array.isArray(params[key])) {
                    (params[key] as string[]).push(value);
                } else {
                    params[key] = [params[key] as string, value];
                }
            } else {
                params[key] = value;
            }
        });
        return params;
    }

    static async formdataToObject(
        formData: FormData
    ): Promise<Record<string, unknown>> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of formData.entries()) {
            // Handle multiple values for the same key (like checkboxes)
            if (result[key] !== undefined) {
                if (Array.isArray(result[key])) {
                    (result[key] as unknown[]).push(value);
                } else {
                    result[key] = [result[key], value];
                }
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    serve() {
        Deno.serve(async (req) => {
            const url = new URL(req.url);
            const method = req.method as HttpMethods;

            const handler = this.handlers[method][url.pathname];
            if (handler) {
                const ctx: HttpRequest = {
                    request: req,
                    params: Http.parseQueryParams(url),
                    cookies: Http.parseCookie(req),
                    url,
                    res: null as any,
                };

                ctx.res = new ResponseHelpers(ctx);

                // Add form data if needed
                if (method === "POST" || method === "PUT") {
                    try {
                        const formData = await req.formData();
                        ctx.formData = await Http.formdataToObject(formData);
                    } catch (error) {
                        console.error("Error parsing form data:", error);
                    }
                }

                return handler(ctx);
            }

            const filePath = `${this.staticDir}${decodeURIComponent(
                url.pathname
            )}`;
            try {
                const fileInfo = await Deno.stat(filePath);
                if (fileInfo.isFile) {
                    return await Http.serveStaticFile(req, filePath);
                }
            } catch (error) {
                console.error("Error serving file:", error);
            }

            return new Response("404 Not Found", { status: 404 });
        });
    }
}

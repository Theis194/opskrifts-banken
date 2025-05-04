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

// For authenticated routes
type AuthenticatedHandler = (
    req: Request,
    user: SafeUser, // No longer optional
) => Promise<Response>;

// For public routes
type PublicHandler = (
    req: Request,
    user?: SafeUser, // Still optional
) => Promise<Response>;

export class Http {
    handlers: Record<
        HttpMethods,
        Record<string, (req: Request) => Promise<Response>>
    >;
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
        Http.eta = eta
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
        handler: AuthenticatedHandler | PublicHandler,
        options: {
            requireAuth?: boolean;
            acm?: {
                resource: Ressource;
                permission: Permission;
            };
        } = { requireAuth: true },
    ): Http {
        this.handlers[method][path] = async (req: Request) => {
            // Always run auth middleware to get user if available
            const { user, response } = await Http.authMiddleware(req);

            // If auth is required but no user exists
            if (options.requireAuth && !user) {
                return response || new Response("Unauthorized", { status: 401 });
            }

            // If user exists and ACM permissions are required
            if (user && options.acm) {
                if (
                    !hasRessourcePermission(
                        user.role,
                        options.acm.resource,
                        options.acm.permission,
                    )
                ) {
                    return new Response("Forbidden", { status: 403 });
                }
            }

            // Call handler with appropriate parameters
            if (options.requireAuth) {
                return (handler as AuthenticatedHandler)(req, user!); // We know user exists here
            } else {
                return (handler as PublicHandler)(req, user || undefined);
            }
        };
        return this;
    }

    static async serveStaticFile(
        req: Request,
        filePath: string,
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
        data: Record<string, unknown> = {},
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

    static async authMiddleware(
        req: Request,
    ): Promise<
        {
            user: { email: string; username: string; role: Role } | null;
            response?: Response;
        }
    > {
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
                    error instanceof Error && error.name === "TokenExpiredError" &&
                    refreshToken
                ) {
                    try {
                        const refreshPayload = verifyRefreshToken(refreshToken);
                        const newToken = generateToken(refreshPayload);
                        const newRefreshToken = generateRefreshToken(refreshPayload);

                        const headers = {
                            "Set-Cookie":
                                `jwt=${newToken}; Path=/; Secure; HttpOnly, refreshToken=${newRefreshToken}; Path=/; Secure; HttpOnly`,
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
        const redirectUrl = `${url.origin}/login?redirect=${encodeURIComponent(url.pathname)
            }`;
        return new Response(null, {
            status: 302,
            headers: {
                ...headers,
                location: redirectUrl,
            },
        });
    }

    serve() {
        Deno.serve(async (req) => {
            const url = new URL(req.url);
            const method = req.method as HttpMethods;

            const handler = this.handlers[method][url.pathname];
            if (handler) {
                return handler(req);
            }

            const filePath = `${this.staticDir}${decodeURIComponent(url.pathname)}`;
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

type HttpMethods = "GET" | "POST" | "PUT" | "DELETE";

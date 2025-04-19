import { genereateGuestToken } from "../../jwt/jwt.ts";
import { readReviews } from "../../db/db_reviews.ts";
import { Role } from "../../acm/permission.ts";
import { Http } from "../wrapper.ts";

/*
export async function exampleRouteFunction(
  req: Request,
  user: {
    email: string;
    username: string;
    role: Role;
  } | undefined,
): Promise<Response> {
}
 */

export async function getIndex(req: Request): Promise<Response> {
  const cookies = Http.parseCookie(req);
  const token = cookies.jwt;

  const reviews = await readReviews(Http.db);

  const { user } = await Http.authMiddleware(req);

  if (!token) {
    const guestToken = genereateGuestToken();
    const headers = new Headers({
      "Set-Cookie": `jwt=${guestToken}; HttpOnly; Secure; Path=/`,
    });

    const data = {
      user: { isAuthenticated: false, name: user?.username },
      reviews: reviews,
    };

    const response = await Http.renderTemplate("index.eta", data);
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }
    return response;
  }

  const isAuthenticated = user?.role === "user" || user?.role === "admin";
  const data = {
    user: { isAuthenticated: isAuthenticated, name: user?.username },
    reviews: reviews,
  };
  // If token exists it just serves the static file like normal
  return await Http.renderTemplate("index.eta", data);
}

export async function getPasswords(
  req: Request,
  user: {
    email: string;
    username: string;
    role: Role;
  } | undefined,
): Promise<Response> {
  try {
    // Query all passwords from the database
    const logins = Http.db.query(
      "SELECT * FROM passwords where passwords.user_email=?",
      [user?.email],
    );

    // Ensure logins is an array
    const validLogins = Array.isArray(logins) ? logins : [];

    const transformedData = validLogins.map((item) => ({
      website: item[2],
      username: item[3],
    }));

    const dataToRender = {
      data: transformedData,
      user: {
        isAuthenticated: user?.role === "user" || user?.role === "admin",
        name: user?.username,
      },
    };

    const response = Http.renderTemplate("passwords.eta", dataToRender);
    response.headers.set("content-type", "text/html");

    return response;
  } catch (_error) {
    return Http.redirect(new URL(req.url));
  }
}

export async function getLogin(req: Request): Promise<Response> {
  return await Http.serveStaticFile(req, "./bestpass/public/login.html");
}

export async function getAdmin(
  req: Request,
  user: { email: string; username: string; role: Role } | undefined,
): Promise<Response> {
  // Check if user is admin
  console.log(user?.role)
  if (user?.role !== "admin") {
    return new Response("you are enot admin", { status: 403 });
  }
  
  return Http.renderTemplate("admin.eta", { user });
}

import { z } from "zod";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { RecipeSchema } from "./recipe-create.ts";
import { RecipeInserter } from "../../db/recipeInserter.ts";
import { Http } from "../wrapper.ts";
import { LoginSchema } from "./login-attempt.ts";
import { getUserByNameOrEmail } from "../../db/user.ts";
import { generateRefreshToken, generateToken } from "../../jwt/jwt.ts";
import { userInfo } from "node:os";
import { Role } from "../../acm/permission.ts";

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

export async function postNewRecipe(req: Request): Promise<Response> {
  try {
    const rawData = await req.json();

    const recipeData = RecipeSchema.parse(rawData);
    const userId = 1; // get userId from jwt

    const inserter = new RecipeInserter(Http.db);
    const recipeId = await inserter.insertRecipe(userId, recipeData);

    return Response.json(`RecipeId: ${recipeId}`);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Validation failed",
          issues: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

type loginRawData = { username: string; password: string };
export async function postLogin(req: Request): Promise<Response> {
  try {
    const rawData = await req.formData();
    const parsedLogin: loginRawData = {
      username: rawData.get("username") as string,
      password: rawData.get("password") as string,
    };

    const login = LoginSchema.parse(parsedLogin);

    const queryResult = await getUserByNameOrEmail(Http.db, login.username);
    const user = {
      username: queryResult.username,
      email: queryResult.email,
      role: queryResult.role as Role,
    };

    const correctPassword = await bcrypt.compare(
      login.password,
      queryResult?.password_hash,
    );
    if (correctPassword) {
      const token = generateToken(user);

      const refreshToken = generateRefreshToken(user);

      const redirectUrl = new URL(req.url).searchParams.get("redirect") || "/";

      const headers = new Headers({
        "location": redirectUrl,
      });

      headers.append("Set-Cookie", `jwt=${token}; HttpOnly; Secure; Path=/`);
      headers.append(
        "Set-Cookie",
        `refreshToken=${refreshToken}; HttpOnly; Secure; Path=/`,
      );

      return new Response(null, {
        status: 302, // 302 redirect
        headers,
      });
    } else {
      const headers = new Headers({
        "location": "/",
      });
      return new Response("User not found", { status: 404, headers });
    }
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Validation failed",
          issues: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

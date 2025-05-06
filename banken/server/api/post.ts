import { z } from "zod";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { RecipeSchema } from "./recipe-create.ts";
import { RecipeInserter } from "../../db/recipeInserter.ts";
import { Http, QueryParams } from "../wrapper.ts";
import { LoginSchema } from "./login-attempt.ts";
import { createUser, getUserByNameOrEmail, NewUser } from "../../db/user.ts";
import { generateRefreshToken, generateToken } from "../../jwt/jwt.ts";
import { Role } from "../../acm/permission.ts";
import { SafeUser } from "../../db/user-db.ts";

/*
export async function exampleRouteFunction(
  req: Request,
  user: SafeUser,
  params: QueryParams,
): Promise<Response> {
}
 */

export async function postNewRecipe(req: Request): Promise<Response> {
    try {
        const rawData = await req.json();

        const recipeData = RecipeSchema.parse(rawData);
        const userId = 1; // get userId from jwt

        const inserter = new RecipeInserter(Http.client);
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
        console.log(login);
        const queryResult = await getUserByNameOrEmail(Http.client, login.username);
        const user = {
            username: queryResult.username,
            email: queryResult.email,
            role: queryResult.role as Role,
        };
        console.log(user);

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
                status: 200, // 302 redirect
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
                    issues: "Username or Password invalid",
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

export async function postLogout(_req: Request): Promise<Response> {
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie":
                `jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly, ` +
                `refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly`
        }
    });
}

export async function postCreateUser(
    req: Request,
    _user: SafeUser,
    _params: QueryParams,
): Promise<Response> {
    const rawData = await req.formData()
    const data = await Http.formdataToObject(rawData);

    const newUser: NewUser = { username: data.name as string, email: data.email as string, password: data.password as string, role: data.role as string };

    let issues = { nameError: "", passwordError: "" };
    if (newUser.username.length < 3) {
        issues.nameError = "Username must be longer than 3";
    }

    if (newUser.password.length < 5) {
        issues.passwordError = "Password must be longer than 5";
    }

    if (issues.nameError !== "" || issues.passwordError !== "") {
        return new Response(JSON.stringify({ success: false, issues }), { status: 422 });
    }

    const result = await createUser(Http.client, newUser);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}

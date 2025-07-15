import { z } from "zod";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { RecipeSchema } from "./recipe-create.ts";
import { RecipeInserter } from "../../db/recipeInserter.ts";
import { Http, HttpRequest } from "../wrapper.ts";
import { LoginSchema } from "./login-attempt.ts";
import { createUser, getUserByNameOrEmail, getUserIdByName, NewUser } from "../../db/user.ts";
import { generateRefreshToken, generateToken } from "../../jwt/jwt.ts";
import { Role } from "../../acm/permission.ts";
import { addItemToList, createNewList, removeItemFromList, shareList, userCanEdit, userIsAuthor } from "../../db/shopping.ts";

/*
export async function exampleRouteFunction(ctx: HttpRequest): Promise<Response> {
}
 */

export async function postNewRecipe(ctx: HttpRequest): Promise<Response> {
    try {
        const rawData = await ctx.request.json();

        const recipeData = RecipeSchema.parse(rawData);
        const userId = 1; // get userId from jwt

        const inserter = new RecipeInserter(Http.client);
        const recipeId = await inserter.insertRecipe(userId, recipeData);

        return Response.json(`RecipeId: ${recipeId}`);
    } catch (error) {
        console.error(error);
        if (error instanceof z.ZodError) {
            return ctx.res.json(
                {
                    error: "Validation failed",
                    issues: error.errors.map((err) => ({
                        path: err.path.join("."),
                        message: err.message,
                    })),
                },
                400
            );
        }
        return ctx.res.json({ error: "Internal server error" }, 500);
    }
}

type LoginRawData = { username: string; password: string };
export async function postLogin(ctx: HttpRequest): Promise<Response> {
    try {
        // Since formData is already parsed in middleware, we can use ctx.formData directly
        if (!ctx.formData) {
            return ctx.res.redirectWithError("missing_form_data");
        }

        const parsedLogin: LoginRawData = {
            username: ctx.formData.username as string,
            password: ctx.formData.password as string,
        };

        const login = LoginSchema.parse(parsedLogin);

        const queryResult = await getUserByNameOrEmail(
            Http.client,
            login.username
        );

        if (!queryResult) {
            return ctx.res.redirectWithError("invalid_credentials");
        }

        const correctPassword = await bcrypt.compare(
            login.password,
            queryResult?.password_hash
        );

        if (!correctPassword) {
            return ctx.res.redirectWithError("invalid_credentials");
        }

        const user = {
            username: queryResult.username,
            email: queryResult.email,
            role: queryResult.role as Role,
            id: queryResult.user_id
        };

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        ctx.res
            .setCookies({
                jwt: token,
                refreshToken: refreshToken,
            })
            .redirect(ctx.url.searchParams.get("redirect") || "/");

        // Use ctx.url instead of req.url
        const redirectUrl = ctx.url.searchParams.get("redirect") || "/";

        const headers = new Headers({
            location: redirectUrl,
        });

        headers.append(
            "Set-Cookie",
            `jwt=${token}; HttpOnly; Secure; Path=/; SameSite=Strict`
        );
        headers.append(
            "Set-Cookie",
            `refreshToken=${refreshToken}; HttpOnly; Secure; Path=/; SameSite=Strict`
        );

        return new Response(null, {
            status: 302, // Changed to 302 for proper redirect
            headers,
        });
    } catch (error) {
        console.error(error);

        if (error instanceof z.ZodError) {
            // Redirect back to login with error message
            return ctx.res.redirectWithError("incalid_input");
        }

        // For other errors, redirect to login with generic error
        return ctx.res.redirectWithError("server_error");
    }
}

export async function postLogout(_ctx: HttpRequest): Promise<Response> {
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie":
                `jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly, ` +
                `refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly`,
        },
    });
}

export async function postCreateUser(ctx: HttpRequest): Promise<Response> {
    const data = ctx.formData;

    if (!data) {
        return ctx.res.json({
            success: false,
            issues: "Failed to receive new user data",
        });
    }

    const newUser: NewUser = {
        username: data.name as string,
        email: data.email as string,
        password: data.password as string,
        role: data.role as string,
    };

    const issues = { nameError: "", passwordError: "" };
    if (newUser.username.length < 3) {
        issues.nameError = "Username must be longer than 3";
    }

    if (newUser.password.length < 5) {
        issues.passwordError = "Password must be longer than 5";
    }

    if (issues.nameError !== "" || issues.passwordError !== "") {
        return new Response(JSON.stringify({ success: false, issues }), {
            status: 422,
        });
    }

    const result = await createUser(Http.client, newUser);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function addShoppingItem(ctx: HttpRequest): Promise<Response> {
    const formData = ctx.formData;

    if (!formData) {
        return ctx.res.json({message: "Failed to get formdata"}, 400);
    }

    if (!ctx.user) {
        return ctx.res.json({message: "No User"}, 400);
    }

    if (!userCanEdit(Http.client, Number.parseInt(formData.listId as string), ctx.user.id)) {
        return ctx.res.json({message: "User can not edit this shopping list"}, 400);
    }
    
    console.log(formData)

    try {
        const result = await addItemToList(Http.client, {
            listId: formData.listId as string,
            itemName: formData.itemName as string,
            quantity: formData.quantity as string,
            unit: formData.unit as string,
            addedBy: formData.addedBy as string,
        });

        console.log('item added successfully:', result);
    } catch (error) {
        console.error('Error adding item to list:', error)
    }

    return ctx.res.json({ success: true })
}

export async function removeShoppingItem(ctx: HttpRequest): Promise<Response> {
    const formData = ctx.formData;

    if (!formData) {
        return ctx.res.json({message: "Failed to get formdata"}, 400);
    }
    
    if (!ctx.user) {
        return ctx.res.json({message: "No User"}, 400);
    }

    if (!userCanEdit(Http.client, Number.parseInt(formData.listId as string), ctx.user.id)) {
        return ctx.res.json({message: "User can not edit this shopping list"}, 400);
    }

    try {
        const result = await removeItemFromList(Http.client, {
            listId: formData.listId as string,
            itemName: formData.itemName as string,
            quantity: formData.quantity as string,
            unit: formData.unit as string,
            addedBy: formData.addedBy as string,
        });

        console.log('item removed successfully:', result);
    } catch (error) {
        console.error('Error removing item from list:', error)
    }

    return ctx.res.json({ success: true })
}

export async function createNewShoppingList(ctx: HttpRequest): Promise<Response> {
    const formData = ctx.formData;
    if (!formData) {
        return ctx.res.json({message: "Failed to get formdata"}, 400);
    }
    
    if (!ctx.user) {
        return ctx.res.json({message: "User can not create shopping list"}, 400);
    }

    const userId = ctx.user.id;
    const listName = formData.listName as string;

    try {
        const result = await createNewList(Http.client, listName, userId);

        if (result.success) {
            return ctx.res.redirect(`/list?id=${result.listId}`);
        } else {
            return ctx.res.json({message: result.message}, 400);
        }
    } catch (error) {
        console.error('Failed to create new shopping list', error);
        return ctx.res.redirectWithError("400")
    }
}

export async function shareListWithUser(ctx: HttpRequest): Promise<Response> {
    const formData = ctx.formData;
    if (!formData) {
        return ctx.res.json({message: "Failed to get formdata"}, 400);
    }
    
    if (!ctx.user) {
        return ctx.res.json({message: "User can not create shopping list"}, 400);
    }

    
    const username = formData.username as string;
    
    const listId = Number.parseInt(formData.listId as string);
    const userId = (await getUserIdByName(Http.client, username)).userid;
    const addedBy = ctx.user.id;

    const userCanShare = await userIsAuthor(Http.client, listId, addedBy);
    if (userCanShare) {
        const input = {listId, userId, addedBy};
    
        const _result = await shareList(Http.client, input)
        
        return ctx.res.redirect(`/list?id=${listId}`);
    }

    return ctx.res.json({message: "User is not allowed to share list"}, 400);
}
import { Http, HttpRequest } from "../wrapper.ts";
import {
    GetPaginatedRecipes,
    TotalRecipesCount,
    SearchRecipes,
    TotalSearchCount,
} from "../../db/allRecipe.ts";
import {
    getFeaturedRecipes,
    getKnownCategories,
    getKnownIngredients,
    getKnownTags,
    getRecentlyAdded,
    getRecipeById,
} from "../../db/recipes.ts";
import { hasRessourcePermission } from "../../acm/permission.ts";

/*
export async function exampleRouteFunction(ctx: HttpRequest): Promise<Response> {
}
 */

export async function getIndex(ctx: HttpRequest): Promise<Response> {
    const isAdmin = ctx.user
        ? hasRessourcePermission(ctx.user.role, "recipe", "read")
        : false;
    const isLoggedIn = ctx.user ? true : false;
    const recipes = await getFeaturedRecipes(Http.client);
    const recentlyAdded = await getRecentlyAdded(Http.client);

    const data = { isAdmin, isLoggedIn, recipes, recentlyAdded };

    return Http.renderTemplate("index.eta", data);
}

export async function getAddRecipe(ctx: HttpRequest): Promise<Response> {
    const isAdmin = ctx.user
        ? hasRessourcePermission(ctx.user.role, "recipe", "read")
        : false;
    const isLoggedIn = ctx.user ? true : false;
    const ingredients = await getKnownIngredients(Http.client);
    const categories = await getKnownCategories(Http.client);
    const tags = await getKnownTags(Http.client);

    const data = { isAdmin, isLoggedIn, ingredients, categories, tags };

    return await Http.renderTemplate("addRecipe", data);
}

export async function getRecipePage(ctx: HttpRequest): Promise<Response> {
    const isAdmin = ctx.user
        ? hasRessourcePermission(ctx.user.role, "recipe", "read")
        : false;
    const isLoggedIn = ctx.user ? true : false;
    const recipeId = Number(ctx.params.id);
    const recipe = await getRecipeById(Http.client, recipeId);

    const data = { isAdmin, isLoggedIn, recipe };

    return await Http.renderTemplate("recipe", data);
}

const RECIPES_PER_PAGE = 12;

export async function getRecipesPage(ctx: HttpRequest): Promise<Response> {
    const client = Http.client;

    const isAdmin = ctx.user
        ? hasRessourcePermission(ctx.user.role, "recipe", "read")
        : false;

    let page = Number(ctx.params.page);
    if (Number.isNaN(page) || page < 1) page = 1;

    const [recipes, total] = await Promise.all([
        await GetPaginatedRecipes(client, page),
        await TotalRecipesCount(client),
    ]);

    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

    const data = {
        isAdmin,
        recipes,
        pagination: {
            currentPage: page,
            totalPages,
        },
    };

    return Http.renderTemplate("partials/view_recipe", data);
}

export async function searchRecipes(ctx: HttpRequest): Promise<Response> {
    const client = Http.client;

    const isAdmin = ctx.user
        ? hasRessourcePermission(ctx.user.role, "recipe", "read")
        : false;

    const search = ctx.params.query as string;
    console.log("Search: " + search);

    let page = Number(ctx.params.page);
    if (Number.isNaN(page) || page < 1) page = 1;

    const [recipes, total] = await Promise.all([
        SearchRecipes(client, search, page),
        TotalSearchCount(client, search),
    ]);

    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

    const data = {
        isAdmin,
        recipes,
        pagination: {
            currentPage: page,
            totalPages,
        },
    };

    return Http.renderTemplate("partials/recipe_list", data);
}

export async function getAllRecipesPage(ctx: HttpRequest): Promise<Response> {
    const client = Http.client;

    const isAdmin = ctx.user
        ? hasRessourcePermission(ctx.user.role, "recipe", "read")
        : false;

    const isLoggedIn = ctx.user ? true : false;

    let page = Number(ctx.params.page);
    if (Number.isNaN(page) || page < 1) page = 1;

    const [recipes, total] = await Promise.all([
        await GetPaginatedRecipes(client, page),
        await TotalRecipesCount(client),
    ]);

    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

    const data = {
        isAdmin,
        isLoggedIn,
        recipes,
        pagination: {
            currentPage: page,
            totalPages,
        },
    };

    return Http.renderTemplate("allRecipes", data);
}

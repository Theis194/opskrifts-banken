import { Http, QueryParams } from "../wrapper.ts";
import { GetPaginatedRecipes, TotalRecipesCount, SearchRecipes, TotalSearchCount } from "../../db/allRecipe.ts";
import {
    getFeaturedRecipes,
    getKnownCategories,
    getKnownIngredients,
    getKnownTags,
    getRecentlyAdded,
    getRecipeById,
} from "../../db/recipes.ts";
import { SafeUser } from "../../db/user-db.ts";
import { hasRessourcePermission } from "../../acm/permission.ts";

/*
export async function exampleRouteFunction(
  req: Request,
  user: SafeUser,
  params: QueryParams,
): Promise<Response> {
}
 */

export async function getIndex(
    _req: Request,
    user: SafeUser,
    _params: QueryParams,
): Promise<Response> {
    const isAdmin = user
        ? hasRessourcePermission(user.role, "recipe", "read")
        : false;
    const isLoggedIn = user ? true : false;
    const recipes = await getFeaturedRecipes(Http.client);
    const recentlyAdded = await getRecentlyAdded(Http.client);

    const data = { isAdmin, isLoggedIn, recipes, recentlyAdded };

    return Http.renderTemplate("index.eta", data);
}

export async function getAddRecipe(
    _req: Request,
    user: SafeUser,
    _params: QueryParams,
): Promise<Response> {
    const isAdmin = hasRessourcePermission(user.role, "recipe", "read");
    const isLoggedIn = user ? true : false;
    const ingredients = await getKnownIngredients(Http.client);
    const categories = await getKnownCategories(Http.client);
    const tags = await getKnownTags(Http.client);

    const data = { isAdmin, isLoggedIn, ingredients, categories, tags };

    return await Http.renderTemplate("addRecipe", data);
}

export async function getRecipePage(
    _req: Request,
    user: SafeUser,
    params: QueryParams,
): Promise<Response> {
    const isAdmin = user
        ? hasRessourcePermission(user.role, "recipe", "read")
        : false;
    const isLoggedIn = user ? true : false;
    const recipeId = Number(params.id);
    const recipe = await getRecipeById(Http.client, recipeId);

    const data = { isAdmin, isLoggedIn, recipe };

    return await Http.renderTemplate("recipe", data);
}
const RECIPES_PER_PAGE = 12;

export async function getRecipesPage(
    _req: Request,
    user: SafeUser,
    params: QueryParams,
): Promise<Response> {
    const client = Http.client;

    const isAdmin = user
        ? hasRessourcePermission(user.role, "recipe", "read")
        : false;

    let page = Number(params.page);
    if (Number.isNaN(page) || page < 1) page = 1;

    const [recipes, total] = await Promise.all([
        await GetPaginatedRecipes(client, page),
        await TotalRecipesCount(client)
    ]);

    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

    const data = {
        isAdmin,
        recipes,
        pagination: {
            currentPage: page,
            totalPages,
        }
    };

    return Http.renderTemplate("partials/view_recipe", data);
}

export async function searchRecipes(
    _req: Request,
    user: SafeUser,
    params: QueryParams,
): Promise<Response> {
    const client = Http.client;

    const isAdmin = user
        ? hasRessourcePermission(user.role, "recipe", "read")
        : false;

    const search = params.query as string;
    let page = Number(params.page);
    if (Number.isNaN(page) || page < 1) page = 1;

    const [recipes, total] = await Promise.all([
        SearchRecipes(client, search, page),
        TotalSearchCount(client, search)
    ]);

    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

    const data = {
        isAdmin,
        recipes,
        pagination: {
            currentPage: page,
            totalPages,
        }
    }

    return Http.renderTemplate("partials/recipe_list", data);
}

export async function getAllRecipesPage(
    _req: Request,
    user: SafeUser,
    params: QueryParams,
): Promise<Response> {
    const client = Http.client;

    const isAdmin = user
        ? hasRessourcePermission(user.role, "recipe", "read")
        : false;

    const isLoggedIn = user ? true : false;

    let page = Number(params.page);
    if (Number.isNaN(page) || page < 1) page = 1;

    const [recipes, total] = await Promise.all([
        await GetPaginatedRecipes(client, page),
        await TotalRecipesCount(client)
    ]);

    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

    const data = {
        isAdmin,
        isLoggedIn,
        recipes,
        pagination: {
            currentPage: page,
            totalPages,
        }
    };

    return Http.renderTemplate("allRecipes", data);
}

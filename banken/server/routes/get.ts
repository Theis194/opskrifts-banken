import { Http, QueryParams } from "../wrapper.ts";
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

export async function getAdmin(
    _req: Request,
    user: SafeUser,
    _params: QueryParams,
): Promise<Response> {
    const isAdmin = hasRessourcePermission(user.role, "admin", "read");
    const isLoggedIn = user ? true : false;

    const data = { isAdmin, isLoggedIn };

    return await Http.renderTemplate("admin", data);
}

export async function getAdminAddRecipe(
    _req: Request,
    user: SafeUser,
    _params: QueryParams,
): Promise<Response> {
    const ingredients = await getKnownIngredients(Http.client);
    const categories = await getKnownCategories(Http.client);
    const tags = await getKnownTags(Http.client);

    const data = { ingredients, categories, tags };

    return await Http.renderTemplate("/partials/add_recipe", data);
}

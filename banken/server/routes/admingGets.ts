import { hasRessourcePermission } from "../../acm/permission.ts";
import { Http, QueryParams } from "../wrapper.ts";
import { SafeUser } from "../../db/user-db.ts";
import {
    getKnownCategories,
    getKnownIngredients,
    getKnownTags,
} from "../../db/recipes.ts";

/*
export async function exampleRouteFunction(
  req: Request,
  user: SafeUser,
  params: QueryParams,
): Promise<Response> {
}
 */

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

export async function getCreateUser(
    _req: Request,
    _user: SafeUser,
    _params: QueryParams,
): Promise<Response> {
    return Http.renderTemplate("/partials/create_user");
}

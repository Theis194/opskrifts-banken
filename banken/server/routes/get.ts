import { Http } from "../wrapper.ts";
import {
  getFeaturedRecipes,
  getKnownCateogires,
  getKnownIngredients,
  getKnownTags,
  getRecentlyAdded,
} from "../../db/recipes.ts";
import { SafeUser } from "../../db/user-db.ts";
import { hasRessourcePermission } from "../../acm/permission.ts";

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

export async function getIndex(
  _req: Request,
  user: SafeUser,
): Promise<Response> {
  const isAdmin = user
    ? hasRessourcePermission(user.role, "recipe", "read")
    : false;
  const isLoggedIn = user ? true : false;
  const recipes = await getFeaturedRecipes(Http.db);
  const recentlyAdded = await getRecentlyAdded(Http.db);

  const data = { isAdmin, isLoggedIn, recipes, recentlyAdded };

  return Http.renderTemplate("index.eta", data);
}

export async function getAddRecipe(
  _req: Request,
  user: SafeUser,
): Promise<Response> {
  const isAdmin = hasRessourcePermission(user.role, "recipe", "read");
  const isLoggedIn = user ? true : false;
  const ingredients = await getKnownIngredients(Http.db);
  const categories = await getKnownCateogires(Http.db);
  const tags = await getKnownTags(Http.db);

  const data = { isAdmin, isLoggedIn, ingredients, categories, tags};

  return await Http.renderTemplate("addRecipe", data);
}

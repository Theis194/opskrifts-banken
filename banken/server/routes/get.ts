import { Http } from "../wrapper.ts";
import { getFeaturedRecipes, getRecentlyAdded, getKnownIngredients, getKnownCateogires, getKnownTags } from "../../db/recipes.ts";

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

export async function getIndex(_req: Request): Promise<Response> {
  const recipes = await getFeaturedRecipes(Http.db);
  const recentlyAdded = await getRecentlyAdded(Http.db);

  const data = { recipes, recentlyAdded };

  return Http.renderTemplate("index.eta", data);
}

export async function getAddRecipe(_req: Request): Promise<Response> {
  const ingredients = await getKnownIngredients(Http.db);
  const categories = await getKnownCateogires(Http.db);
  const tags = await getKnownTags(Http.db);
  
  const data = { ingredients, categories, tags };

  return await Http.renderTemplate("addRecipe", data);
}

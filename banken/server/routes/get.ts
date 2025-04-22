import { Http } from "../wrapper.ts";
import { getFeaturedRecipes, getRecentlyAdded } from "../../db/recipes.ts";

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
  const recipes = await getFeaturedRecipes(Http.db);
  const recentlyAdded = await getRecentlyAdded(Http.db);

  const data = { recipes, recentlyAdded };

  return Http.renderTemplate("index.eta", data);
}

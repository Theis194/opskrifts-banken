import { Http } from "../wrapper.ts";
import { getRecipes } from "../../db/recipes.ts";

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
  const recipes = await getRecipes(Http.db);
  console.log(recipes);
  
  return Http.serveStaticFile(req, "./banken/public/index.html");
}
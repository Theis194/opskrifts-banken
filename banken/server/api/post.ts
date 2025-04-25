import { z } from "zod";
import { RecipeSchema } from "./recipe-create.ts";
import { RecipeInserter } from "../../db/recipeInserter.ts";
import { Http } from "../wrapper.ts";

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

export async function postNewRecipe(req: Request): Promise<Response> {
  try {
    const rawData = await req.json();

    const recipeData = RecipeSchema.parse(rawData);
    const userId = 1; // get userId from jwt

    const inserter = new RecipeInserter(Http.db);
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

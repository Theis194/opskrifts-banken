import { z } from "zod";
import { RecipeSchema } from "./recipe-create.ts";

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
    console.log("Recieved recipe");
    const rawData = await req.json();

    const recipeData = RecipeSchema.parse(rawData);

    return Response.json(recipeData);
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

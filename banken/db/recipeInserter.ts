import { Client } from "jsr:@db/postgres";
import { Recipe } from "../server/api/recipe-create.ts";

export class RecipeInserter {
    private client: Client;
    private recipeId?: number;

    constructor(client: Client) {
        this.client = client;
    }

    async insertRecipe(userId: number, recipeData: Recipe): Promise<number> {
        await this.client.queryObject("BEGIN TRANSACTION");

        try {
            this.recipeId = await this.insertRecipeBase(userId, recipeData);

            await this.insertCategories(recipeData.categories);
            await this.insertTags(recipeData.tags);
            await this.insertIngredients(recipeData.ingredients);
            await this.insertInstructions(recipeData.instructions);

            await this.client.queryObject("COMMIT");
            return this.recipeId;
        } catch (error) {
            await this.client.queryObject("ROLLBACK");
            throw error;
        }
    }

    private async insertRecipeBase(
        userId: number,
        recipe: Recipe,
    ): Promise<number> {
        const result = await this.client.queryObject<{ recipe_id: number }>(
            `INSERT INTO recipes (
            user_id, title, description, prep_time, cook_time, 
            servings, difficulty, cover_image_path
            ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
            ) RETURNING recipe_id`,
            [
                userId,
                recipe.title,
                recipe.description,
                recipe.prepTime,
                recipe.cookTime,
                recipe.servings,
                recipe.difficulty,
                recipe.cover_image,
            ]
        );

        return result.rows[0].recipe_id;
    }

    private async insertCategories(categories: string[]) {
        if (!categories.length) return;

        // First insert all categories that don't exist
        await this.client.queryArray(
            `INSERT INTO categories (name)
     SELECT unnest($1::text[])
     ON CONFLICT (name) DO NOTHING`,
            [categories]
        );

        // Then link all categories to the recipe
        await this.client.queryArray(
            `INSERT INTO recipe_categories (recipe_id, category_id)
     SELECT $1, category_id 
     FROM categories 
     WHERE name = ANY($2)`,
            [this.recipeId, categories]
        );
    }

    private async insertTags(tags: string[]) {
        if (!tags.length) return;

        // Insert all tags that don't exist
        await this.client.queryArray(
            `INSERT INTO tags (name)
         SELECT unnest($1::text[])
         ON CONFLICT (name) DO NOTHING`,
            [tags]
        );

        // Link all tags to the recipe
        await this.client.queryArray(
            `INSERT INTO recipe_tags (recipe_id, tag_id)
         SELECT $1, tag_id 
         FROM tags 
         WHERE name = ANY($2)`,
            [this.recipeId, tags]
        );
    }

    private async insertIngredients(ingredients: Recipe["ingredients"]) {
        if (!ingredients.length) return;

        // First insert all unique ingredients that don't exist
        const uniqueIngredientNames = [...new Set(ingredients.map(i => i.name))];
        await this.client.queryArray(
            `INSERT INTO ingredients (name)
         SELECT unnest($1::text[])
         ON CONFLICT (name) DO NOTHING`,
            [uniqueIngredientNames]
        );

        // Then insert all recipe-ingredient relationships in one batch
        const values = ingredients.map((ingredient, index) =>
            `($1, (SELECT ingredient_id FROM ingredients WHERE name = $${2 + index * 5}), 
        $${3 + index * 5}, $${4 + index * 5}, $${5 + index * 5}, $${6 + index * 5})`
        ).join(',');

        const params = [
            this.recipeId,
            ...ingredients.flatMap((ingredient, index) => [
                ingredient.name,
                ingredient.quantity,
                ingredient.unit,
                ingredient.notes,
                ingredient.sort_order ?? index + 1
            ])
        ];

        await this.client.queryArray(
            `INSERT INTO recipe_ingredients (
            recipe_id, ingredient_id, quantity, unit, notes, sort_order
        ) VALUES ${values}`,
            params
        );
    }

    private async insertInstructions(instructions: Recipe["instructions"]) {
        if (!instructions.length) return;

        // Generate values placeholders and flatten parameters
        const values = instructions.map((_, i) =>
            `($1, $${2 + i * 2}, $${3 + i * 2})`
        ).join(', ');

        const params = [
            this.recipeId,
            ...instructions.flatMap((instruction, index) => [
                index + 1,          // step_number
                instruction.text   // instruction_text
            ])
        ];

        await this.client.queryArray(
            `INSERT INTO instructions (
            recipe_id, step_number, instruction_text
        ) VALUES ${values}`,
            params
        );
    }
}

import { DB } from "https://deno.land/x/sqlite@v3.9.0/mod.ts";
import { Recipe } from "../server/api/recipe-create.ts";

export class RecipeInserter {
  private db: DB;
  private recipeId?: number;

  constructor(db: DB) {
    this.db = db;
  }

  async insertRecipe(userId: number, recipeData: Recipe): Promise<number> {
    this.db.execute("BEGIN TRANSACTION");

    try {
      this.recipeId = await this.insertRecipeBase(userId, recipeData);

      await this.insertCategories(recipeData.categories);
      await this.insertTags(recipeData.tags);
      await this.insertIngredients(recipeData.ingredients);
      await this.insertInstructions(recipeData.instructions);

      this.db.execute("COMMIT");
      return this.recipeId;
    } catch (error) {
      this.db.execute("ROLLBACK");
      throw error;
    }
  }

  private async insertRecipeBase(
    userId: number,
    recipe: Recipe,
  ): Promise<number> {
    const query = this.db.prepareQuery<[number], { recipe_id: number }>(
      `INSERT INTO recipes (
                user_id, title, description, prep_time, cook_time, servings, difficulty, cover_image_path
            ) VALUES (
                :user_id, :title, :description, :prep_time, :cook_time, :servings, :difficulty, :cover_image_path
            ) RETURNING recipe_id`,
    );

    const { recipe_id } = query.firstEntry({
      user_id: userId,
      title: recipe.title,
      description: recipe.description,
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      cover_image_path: recipe.cover_image,
    })!;

    query.finalize();
    return recipe_id;
  }

  private async insertCategories(categories: string[]) {
    const insertCategory = this.db.prepareQuery(
      `INSERT OR IGNORE INTO categories (name) VALUES (:name)`,
    );

    const linkCategory = this.db.prepareQuery(
      `INSERT INTO recipe_categories (recipe_id, category_id)
       VALUES (:recipe_id, (SELECT category_id FROM categories WHERE name = :name))`,
    );

    for (const name of categories) {
      insertCategory.execute({ name });
      linkCategory.execute({ recipe_id: this.recipeId!, name });
    }

    insertCategory.finalize();
    linkCategory.finalize();
  }

  private async insertTags(tags: string[]) {
    const insertTag = this.db.prepareQuery(
      `INSERT OR IGNORE INTO tags (name) VALUES (:name)`,
    );

    const linkTag = this.db.prepareQuery(
      `INSERT INTO recipe_tags (recipe_id, tag_id)
         VALUES (:recipe_id, (SELECT tag_id FROM tags WHERE name = :name))`,
    );

    for (const name of tags) {
      insertTag.execute({ name });
      linkTag.execute({ recipe_id: this.recipeId!, name });
    }

    insertTag.finalize();
    linkTag.finalize();
  }

  private async insertIngredients(ingredients: Recipe["ingredients"]) {
    const insertIngredient = this.db.prepareQuery(
      `INSERT OR IGNORE INTO ingredients (name) VALUES (:name)`,
    );

    const linkIngredient = this.db.prepareQuery(
      `INSERT INTO recipe_ingredients (
        recipe_id, ingredient_id, quantity, unit, notes, sort_order
      ) VALUES (
        :recipe_id, 
        (SELECT ingredient_id FROM ingredients WHERE name = :name),
        :quantity, :unit, :notes, :sort_order
      )`,
    );

    ingredients.forEach((ingredient, index) => {
      insertIngredient.execute({ name: ingredient.name });
      linkIngredient.execute({
        recipe_id: this.recipeId!,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        sort_order: index + 1,
      });
    });

    insertIngredient.finalize();
    linkIngredient.finalize();
  }

  private async insertInstructions(instructions: Recipe["instructions"]) {
    const query = this.db.prepareQuery(
      `INSERT INTO instructions (
        recipe_id, step_number, instruction_text
      ) VALUES (
        :recipe_id, :step_number, :instruction_text
      )`,
    );

    instructions.forEach((instruction, index) => {
      query.execute({
        recipe_id: this.recipeId!,
        step_number: index + 1,
        instruction_text: instruction.text,
      });
    });

    query.finalize();
  }
}

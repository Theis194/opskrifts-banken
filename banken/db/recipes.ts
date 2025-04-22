import { DB } from "https://deno.land/x/sqlite@v3.9.0/mod.ts";
import { RecipeSchema, RecentRecipeSchema, RecentRecipe, Recipe } from "./schemas.ts";

type FeaturedRecipeRow = [
  number, // id
  string, // title
  string | null, // description
  number, // prep_time
  number, // cook_time
  number, // servings
  string, // difficulty
  string | null, // cover_image_path
  string, // author
  string, // created_at
  string, // updated_at
  string | null, // categories (JSON string)
  string | null, // tags (JSON string)
];

type Category = {
  name: string;
  icon: string;
};

type Tag = {
  name: string;
  color: string;
};

export async function getFeaturedRecipes(db: DB) {
  try {
    const query = `
        SELECT 
          r.recipe_id,
          r.title,
          r.description,
          r.prep_time,
          r.cook_time,
          r.servings,
          r.difficulty,
          r.cover_image_path,
          u.username AS author,
          r.created_at,
          r.updated_at,
          (
            SELECT 
              JSON_GROUP_ARRAY(
                JSON_OBJECT('name', c.name, 'icon', COALESCE(c.icon_class, ''))
              )
            FROM recipe_categories rc
            JOIN categories c ON rc.category_id = c.category_id
            WHERE rc.recipe_id = r.recipe_id
          ) AS categories,
          (
            SELECT 
              JSON_GROUP_ARRAY(
                JSON_OBJECT('name', t.name, 'color', COALESCE(t.color, '#999999'))
              )
            FROM recipe_tags rt
            JOIN tags t ON rt.tag_id = t.tag_id
            WHERE rt.recipe_id = r.recipe_id
          ) AS tags
        FROM 
          recipes r
        JOIN 
          users u ON r.user_id = u.user_id
        ORDER BY 
          RANDOM()
        LIMIT 3
      `;

    const recipes = db.query(query) as unknown as FeaturedRecipeRow[];

    // Transform and validate each recipe
    const validatedRecipes: Recipe[] = [];

    for (const row of recipes) {
      try {
        const recipeData = {
          id: row[0],
          title: row[1],
          description: row[2],
          prepTime: row[3],
          cookTime: row[4],
          servings: row[5],
          difficulty: row[6],
          coverImage: row[7],
          author: row[8],
          createdAt: row[9],
          updatedAt: row[10],
          categories: row[11] ? JSON.parse(row[11]) : [],
          tags: row[12] ? JSON.parse(row[12]) : [],
        };

        const validated = RecipeSchema.parse(recipeData);
        validatedRecipes.push(validated);
      } catch (error) {
        console.error(`Error validating recipe ${row[0]} (${row[1]}):`, error);
        // Optionally continue with other recipes even if one fails
      }
    }

    return validatedRecipes;
  } catch (error) {
    console.error("Error fetching recipes:", error);
    throw error;
  }
}

type RecentRecipeRow = [
  string,        // title
  number,        // prep_time
  string,        // added_ago (e.g. "Today", "2 days ago")
  string | null  // categories (JSON string)
];

export async function getRecentlyAdded(db: DB) {
  try {
    const query = `
        SELECT 
          r.title,
          r.prep_time,
          CASE
            WHEN ROUND(julianday('now') - julianday(r.created_at)) = 0 THEN 'Today'
            WHEN ROUND(julianday('now') - julianday(r.created_at)) = 1 THEN '1 day ago'
            ELSE ROUND(julianday('now') - julianday(r.created_at)) || ' days ago'
          END AS added_ago,
          (
            SELECT 
              JSON_GROUP_ARRAY(
                JSON_OBJECT('name', c.name, 'icon', COALESCE(c.icon_class, ''))
              )
            FROM recipe_categories rc
            JOIN categories c ON rc.category_id = c.category_id
            WHERE rc.recipe_id = r.recipe_id
          ) AS categories
        FROM recipes r
        ORDER BY ABS(julianday(r.created_at) - julianday('now')) ASC
        LIMIT 3;
      `;

    const rows = db.query(query) as unknown as RecentRecipeRow[];

    // Transform and validate each recipe
    const validatedRecipes: RecentRecipe[] = [];

    for (const row of rows) {
      try {
        const recipeData = {
          title: row[0],
          prepTime: row[1],
          addedAgo: row[2],
          categories: row[3] ? JSON.parse(row[3]) : [],
        };

        const validated = RecentRecipeSchema.parse(recipeData);
        validatedRecipes.push(validated);
      } catch (error) {
        console.error(`Error validating recipe ${row[0]} (${row[1]}):`, error);
        // Optionally continue with other recipes even if one fails
      }
    }

    return validatedRecipes;
  } catch (error) {
    console.error("Error fetching recipes:", error);
    throw error;
  }
}

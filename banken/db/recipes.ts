import { DB } from "https://deno.land/x/sqlite@v3.9.0/mod.ts";
import { RecipeSchema } from "./schemas.ts";

type RecipeRow = [
    number,       // id
    string,       // title
    string | null, // description
    number,       // prep_time
    number,       // cook_time
    number,       // servings
    string,       // difficulty
    string | null, // cover_image_path
    string,       // author
    string,       // created_at
    string,       // updated_at
    string | null, // categories (comma-separated)
    string | null  // tags (comma-separated)
  ];

export async function getRecipes(db: DB) {
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
            SELECT GROUP_CONCAT(c.name, ', ')
            FROM recipe_categories rc
            JOIN categories c ON rc.category_id = c.category_id
            WHERE rc.recipe_id = r.recipe_id
          ) AS categories,
          (
            SELECT GROUP_CONCAT(t.name, ', ')
            FROM recipe_tags rt
            JOIN tags t ON rt.tag_id = t.tag_id
            WHERE rt.recipe_id = r.recipe_id
          ) AS tags
        FROM 
          recipes r
        JOIN 
          users u ON r.user_id = u.user_id
        ORDER BY 
          r.title ASC
      `;
  
      const recipes = db.query(query) as unknown as RecipeRow[];
  
      // Transform and validate each recipe
      const validatedRecipes = [];
      
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
            categories: row[11] ? row[11].split(", ") : [],
            tags: row[12] ? row[12].split(", ") : []
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

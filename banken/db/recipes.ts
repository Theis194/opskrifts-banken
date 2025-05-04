import { Client } from "jsr:@db/postgres";
import {
    CategoriNameArraySchema,
    IngredientNameArraySchema,
    RecentRecipe,
    RecentRecipeSchema,
    Recipe,
    RecipeSchema,
    TagNameArraySchema,
} from "./recipe-db.ts";

type FeaturedRecipeRow = {
    recipe_id: number;
    title: string;
    description: string | null;
    prep_time: number;
    cook_time: number;
    servings: number;
    difficulty: string;
    cover_image_path: string | null;
    author: string;
    created_at: Date;
    updated_at: Date;
    categories: string | null;
    tags: string | null;
};

export async function getFeaturedRecipes(client: Client) {
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
            COALESCE(
              JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'name', c.name, 
                  'icon', COALESCE(c.icon_class, '')
                )
              ),
              '[]'::jsonb
            )
          FROM recipe_categories rc
          JOIN categories c ON rc.category_id = c.category_id
          WHERE rc.recipe_id = r.recipe_id
        ) AS categories,
        (
          SELECT 
            COALESCE(
              JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'name', t.name, 
                  'color', COALESCE(t.color, '#999999')
                )
              ),
              '[]'::jsonb
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

        const result = await client.queryObject<FeaturedRecipeRow>(query);
        const recipes = result.rows;

        // Transform and validate each recipe
        const validatedRecipes: Recipe[] = [];

        for (const row of recipes) {
            try {
                const recipeData = {
                    id: row.recipe_id,
                    title: row.title,
                    description: row.description,
                    prepTime: row.prep_time,
                    cookTime: row.cook_time,
                    servings: row.servings,
                    difficulty: row.difficulty,
                    coverImage: row.cover_image_path,
                    author: row.author,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    categories: row.categories ? JSON.parse(row.categories) : [],
                    tags: row.tags ? JSON.parse(row.tags) : [],
                };

                const validated = RecipeSchema.parse(recipeData);
                validatedRecipes.push(validated);
            } catch (error) {
                console.error(`Error validating recipe ${row.recipe_id} (${row.title}):`, error);
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
    string, // title
    number, // prep_time
    string, // added_ago (e.g. "Today", "2 days ago")
    string | null, // categories (JSON string)
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

type RawIngredientRow = [string];
type RawIngredientRows = RawIngredientRow[];

export async function getKnownIngredients(db: DB) {
    try {
        const query = `
      SELECT name FROM ingredients Order By name
    `;

        const rows = db.query(query) as unknown as RawIngredientRows;

        const names = IngredientNameArraySchema.parse(rows.map(([name]) => name));

        return names;
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        throw error;
    }
}

type RawCategoriRow = [string, string];
type RawCategoriRows = RawCategoriRow[];
export async function getKnownCateogires(db: DB) {
    try {
        const query = `
      SELECT name, icon_class FROM categories Order By name
    `;

        const rows = db.query(query) as unknown as RawCategoriRows;

        const names = CategoriNameArraySchema.parse(rows.map(([name, icon]) => ({
            name,
            icon
        })));

        const categoriMap = new Map<string, string>;

        names.forEach(({ name, icon }) => {
            categoriMap.set(name, icon);
        })

        return categoriMap;
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        throw error;
    }
}

type RawTagRow = [string, string];
type RawTagRows = RawTagRow[];
export async function getKnownTags(db: DB) {
    try {
        const query = `
      SELECT name, color FROM tags Order By name
    `;

        const rows = db.query(query) as unknown as RawTagRows;

        const tags: Tag[] = rows.map(([name, color]) => ({
            name,
            color
        }));

        const names = TagNameArraySchema.parse(tags);

        const TagMap = new Map<string, string>;

        names.forEach(({ name, color }) => {
            TagMap.set(name, color);
        })

        return TagMap;
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        throw error;
    }
}

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
                    categories: row.categories || [],
                    tags: row.tags || [],
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

type RecentRecipeRow = {
    title: string;
    prep_time: number;
    added_ago: string;
    categories: string | null;
};

export async function getRecentlyAdded(client: Client) {
    try {
        const query = `
  SELECT 
    r.title,
    r.prep_time,
    CASE
      WHEN CURRENT_DATE - r.created_at::date = 0 THEN 'Today'
      WHEN CURRENT_DATE - r.created_at::date = 1 THEN '1 day ago'
      ELSE (CURRENT_DATE - r.created_at::date)::text || ' days ago'
    END AS added_ago,
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
    ) AS categories
  FROM recipes r
  ORDER BY ABS(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - r.created_at))) ASC
  LIMIT 3;
`;
        const result = await client.queryObject<RecentRecipeRow>(query);
        const rows = result.rows;

        // Transform and validate each recipe
        const validatedRecipes: RecentRecipe[] = [];

        for (const row of rows) {
            try {
                const recipeData = {
                    title: row.title,
                    prepTime: row.prep_time,
                    addedAgo: row.added_ago,
                    categories: row.categories || [],
                };

                const validated = RecentRecipeSchema.parse(recipeData);
                validatedRecipes.push(validated);
            } catch (error) {
                console.error(`Error validating recipe ${row.title}:`, error);
                // Optionally continue with other recipes even if one fails
            }
        }

        return validatedRecipes;
    } catch (error) {
        console.error("Error fetching recipes:", error);
        throw error;
    }
}

type RawIngredientRow = { name: string };

export async function getKnownIngredients(client: Client) {
    try {
        const query = `
            SELECT name FROM ingredients ORDER BY name
        `;

        const result = await client.queryObject<RawIngredientRow>(query);
        const names = IngredientNameArraySchema.parse(result.rows.map(row => row.name));

        return names;
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        throw error;
    }
}

type RawCategoryRow = {
    name: string;
    icon_class: string;
};

export async function getKnownCategories(client: Client): Promise<Map<string, string>> {
    try {
        const query = `
      SELECT name, icon_class 
      FROM categories 
      ORDER BY name
    `;

        const result = await client.queryObject<RawCategoryRow>(query);

        // Validate against your CategorySchema array
        const categories = CategoriNameArraySchema.parse(
            result.rows.map(row => ({
                name: row.name,
                icon: row.icon_class
            }))
        );

        // Convert to Map
        const categoryMap = new Map<string, string>();
        categories.forEach(({ name, icon }) => {
            categoryMap.set(name, icon);
        });

        return categoryMap;
    } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
    }
}

type RawTagRow = {
    name: string;
    color: string;
};

export async function getKnownTags(client: Client): Promise<Map<string, string>> {
    try {
        const query = `
      SELECT name, color 
      FROM tags 
      ORDER BY name
    `;

        const result = await client.queryObject<RawTagRow>(query);

        // Directly parse with your TagNameArraySchema
        const tags = TagNameArraySchema.parse(
            result.rows.map(row => ({
                name: row.name,
                color: row.color
            }))
        );

        // Convert to Map
        const tagMap = new Map<string, string>();
        tags.forEach(({ name, color }) => {
            tagMap.set(name, color);
        });

        return tagMap;
    } catch (error) {
        console.error("Error fetching tags:", error);  // Fixed error message
        throw error;
    }
}

export async function getRecipeById(client: Client, id: number) {
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
            ) AS tags,
            (
                SELECT 
                    COALESCE(
                        JSONB_AGG(
                            JSONB_BUILD_OBJECT(
                                'id', i.ingredient_id,
                                'name', i.name,
                                'quantity', ri.quantity,
                                'unit', ri.unit,
                                'notes', COALESCE(ri.notes, '')
                            ) ORDER BY ri.sort_order
                        ),
                        '[]'::jsonb
                    )
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
                WHERE ri.recipe_id = r.recipe_id
            ) AS ingredients
        FROM 
            recipes r
        JOIN
            users u ON r.user_id = u.user_id
        WHERE
            r.recipe_id = $1
        LIMIT 1
    `;

    try {
        const result = await client.queryObject<Recipe>({
            text: query,
            args: [id]
        });

        if (result.rows.length === 0) {
            return null;
        }

        const dbRecipe = result.rows[0];

        // Transform the database fields to match your Zod schema
        const transformedRecipe = {
            id: dbRecipe.recipe_id,
            title: dbRecipe.title,
            description: dbRecipe.description || undefined,
            prepTime: dbRecipe.prep_time,
            cookTime: dbRecipe.cook_time,
            servings: dbRecipe.servings,
            difficulty: dbRecipe.difficulty,
            coverImage: dbRecipe.cover_image_path || undefined,
            author: dbRecipe.author,
            categories: dbRecipe.categories || [],
            tags: dbRecipe.tags || [],
            ingredients: dbRecipe.ingredients ? dbRecipe.ingredients.map(ing => ({
                ...ing,
                unit: ing.unit || undefined // Convert null/empty to undefined
            })) : [],
            createdAt: dbRecipe.created_at,
            updatedAt: dbRecipe.updated_at
        };

        return RecipeSchema.parse(transformedRecipe);
    } catch (error) {
        console.error(`Error fetching recipe with id: ${id}`, error);
        throw error;
    }
}

import { Client } from "jsr:@db/postgres";
import { z } from "zod";
import { ShoppingListSchema, ShoppingListItemSchema } from "./shopping-db.ts";

interface RawShoppingListRow {
    list_id: number;
    list_name: string;
    author_id: number;
    created_at: Date | string;
    updated_at: Date | string;
    is_active: boolean;
    is_owner: boolean;
    can_edit: boolean | null;
    total_items: number | bigint;
    checked_items: number | bigint;
    items: unknown; // Could be array, string, or null
}

export async function getShoppingLists(client: Client, userId: number) {
    try {
        const query = `
      WITH user_lists AS (
  SELECT 
    sl.*, 
    true as is_owner,
    null as can_edit
  FROM shopping_lists sl
  WHERE sl.author_id = $1
  
  UNION
  
  SELECT 
    sl.*, 
    false as is_owner,
    slc.can_edit
  FROM shopping_lists sl
  JOIN shopping_list_contributors slc ON sl.list_id = slc.list_id
  WHERE slc.user_id = $1
),
list_counts AS (
  SELECT
    ul.list_id,
    COUNT(DISTINCT sli.list_item_id) as total_items,
    COUNT(DISTINCT sli.list_item_id) FILTER (WHERE sli.is_checked = true) as checked_items
  FROM user_lists ul
  LEFT JOIN shopping_list_items sli ON ul.list_id = sli.list_id
  GROUP BY ul.list_id
),
list_items AS (
  SELECT
    ul.list_id,
    COALESCE(
      json_agg(
        json_build_object(
          'list_item_id', sli.list_item_id,
          'item_id', si.item_id,
          'item_name', si.item_name,
          'description', si.description,
          'item_type', si.item_type,
          'ingredient_id', si.ingredient_id,
          'quantity', sli.quantity,
          'unit', sli.unit,
          'is_checked', sli.is_checked,
          'added_by', sli.added_by,
          'added_at', sli.added_at,
          'checked_by', sli.checked_by,
          'checked_at', sli.checked_at,
          'sort_order', sli.sort_order,
          'notes', sli.notes,
          'source_recipe_id', sli.source_recipe_id
        ) ORDER BY COALESCE(sli.sort_order, 9999)
      ) FILTER (WHERE sli.list_item_id IS NOT NULL),
      '[]'::json
    ) as items
  FROM user_lists ul
  LEFT JOIN shopping_list_items sli ON ul.list_id = sli.list_id
  LEFT JOIN shopping_items si ON sli.item_id = si.item_id
  GROUP BY ul.list_id
)
SELECT 
  ul.*,
  COALESCE(lc.total_items, 0) as total_items,
  COALESCE(lc.checked_items, 0) as checked_items,
  li.items
FROM user_lists ul
LEFT JOIN list_counts lc ON ul.list_id = lc.list_id
LEFT JOIN list_items li ON ul.list_id = li.list_id
ORDER BY ul.updated_at DESC;
    `;

        const result = await client.queryObject<RawShoppingListRow>(query, [
            userId,
        ]);

        const transformedData = result.rows.map((row: RawShoppingListRow) => {
            let items: unknown = row.items;
            if (typeof items === "string") {
                try {
                    items = JSON.parse(items);
                } catch {
                    items = [];
                }
            } else if (!Array.isArray(items)) {
                items = [];
            }

            return {
                list_id: row.list_id,
                list_name: row.list_name,
                author_id: row.author_id,
                created_at:
                    row.created_at instanceof Date
                        ? row.created_at.toISOString()
                        : row.created_at,
                updated_at:
                    row.updated_at instanceof Date
                        ? row.updated_at.toISOString()
                        : row.updated_at,
                is_active: row.is_active,
                is_owner: row.is_owner,
                can_edit: row.can_edit,
                total_items: Number(row.total_items),
                checked_items: Number(row.checked_items),
                items: items as unknown[],
            };
        });

        const parsed = z.array(ShoppingListSchema).safeParse(transformedData);

        if (!parsed.success) {
            console.error("Validation error:", parsed.error);
            throw new Error("Data validation failed");
        }

        return parsed.data;
    } catch (error) {
        console.error("Database error:", error);
        throw error;
    }
}

interface RawShoppingListDetail {
    list_id: number;
    list_name: string;
    author_id: number;
    author_username: string;
    author_email: string;
    created_at: Date | string;
    updated_at: Date | string;
    is_active: boolean;
    total_items: number | bigint;
    checked_items: number | bigint;
    contributors: unknown; // Will be parsed as array
    items: unknown; // Will be parsed as array
}

export async function getShoppingListById(client: Client, listId: number) {
    try {
        const query = `
WITH list_base AS (
  SELECT 
    sl.*,
    u.username as author_username,
    u.email as author_email
  FROM shopping_lists sl
  JOIN users u ON sl.author_id = u.user_id
  WHERE sl.list_id = $1
),
list_counts AS (
  SELECT
    COUNT(DISTINCT sli.list_item_id) as total_items,
    COUNT(DISTINCT sli.list_item_id) FILTER (WHERE sli.is_checked = true) as checked_items
  FROM shopping_list_items sli
  WHERE sli.list_id = $1
),
contributors AS (
  SELECT
    slc.user_id,
    u.username,
    u.email,
    slc.can_edit,
    slc.added_at,
    slc.added_by
  FROM shopping_list_contributors slc
  JOIN users u ON slc.user_id = u.user_id
  WHERE slc.list_id = $1
),
items AS (
  SELECT
    sli.list_item_id,
    si.item_id,
    si.item_name,
    si.description,
    si.item_type,
    si.ingredient_id,
    sli.quantity,
    sli.unit,
    sli.is_checked,
    sli.added_by,
    sli.added_at,
    sli.checked_by,
    sli.checked_at,
    sli.sort_order,
    sli.notes,
    sli.source_recipe_id
  FROM shopping_list_items sli
  JOIN shopping_items si ON sli.item_id = si.item_id
  WHERE sli.list_id = $1
  ORDER BY COALESCE(sli.sort_order, 9999)
)
SELECT 
  lb.*,
  COALESCE(lc.total_items, 0) as total_items,
  COALESCE(lc.checked_items, 0) as checked_items,
  COALESCE(
    (SELECT json_agg(c) FROM contributors c),
    '[]'::json
  ) as contributors,
  COALESCE(
    (SELECT json_agg(i) FROM items i),
    '[]'::json
  ) as items
FROM list_base lb
CROSS JOIN list_counts lc;
`;

        const result = await client.queryObject<RawShoppingListDetail>(query, [listId]);

        if (result.rows.length === 0) {
            throw new Error("Shopping list not found");
        }

        const row = result.rows[0];

        // Parse contributors
        let contributors: any[] = [];
        if (typeof row.contributors === "string") {
            try {
                contributors = JSON.parse(row.contributors);
            } catch {
                contributors = [];
            }
        } else if (Array.isArray(row.contributors)) {
            contributors = row.contributors;
        }

        // Parse items
        let items: any[] = [];
        if (typeof row.items === "string") {
            try {
                items = JSON.parse(row.items);
            } catch {
                items = [];
            }
        } else if (Array.isArray(row.items)) {
            items = row.items;
        }

        // Transform data
        const transformedData = {
            list_id: row.list_id,
            list_name: row.list_name,
            author: {
                user_id: row.author_id,
                username: row.author_username,
                email: row.author_email,
            },
            created_at: row.created_at instanceof Date 
                ? row.created_at.toISOString() 
                : row.created_at,
            updated_at: row.updated_at instanceof Date 
                ? row.updated_at.toISOString() 
                : row.updated_at,
            is_active: row.is_active,
            total_items: Number(row.total_items),
            checked_items: Number(row.checked_items),
            contributors: contributors.map(c => ({
                user_id: c.user_id,
                username: c.username,
                email: c.email,
                can_edit: c.can_edit,
                added_at: c.added_at instanceof Date 
                    ? c.added_at.toISOString() 
                    : c.added_at,
                added_by: c.added_by,
            })),
            items: items.map(item => ({
                list_item_id: item.list_item_id,
                item_id: item.item_id,
                item_name: item.item_name,
                description: item.description,
                item_type: item.item_type,
                ingredient_id: item.ingredient_id,
                quantity: item.quantity,
                unit: item.unit,
                is_checked: item.is_checked,
                added_by: item.added_by,
                added_at: item.added_at instanceof Date 
                    ? item.added_at.toISOString() 
                    : item.added_at,
                checked_by: item.checked_by,
                checked_at: item.checked_at instanceof Date 
                    ? item.checked_at.toISOString() 
                    : item.checked_at,
                sort_order: item.sort_order,
                notes: item.notes,
                source_recipe_id: item.source_recipe_id,
            })),
        };

        // Create schema for validation
        const ContributorSchema = z.object({
            user_id: z.number(),
            username: z.string(),
            email: z.string(),
            can_edit: z.boolean(),
            added_at: z.string(),
            added_by: z.number(),
        });

        const ShoppingListDetailSchema = z.object({
            list_id: z.number(),
            list_name: z.string(),
            author: z.object({
                user_id: z.number(),
                username: z.string(),
                email: z.string(),
            }),
            created_at: z.string(),
            updated_at: z.string(),
            is_active: z.boolean(),
            total_items: z.number(),
            checked_items: z.number(),
            contributors: z.array(ContributorSchema),
            items: z.array(ShoppingListItemSchema),
        });

        const parsed = ShoppingListDetailSchema.safeParse(transformedData);

        if (!parsed.success) {
            console.error("Validation error:", parsed.error);
            throw new Error("Data validation failed");
        }

        return parsed.data;
    } catch (error) {
        console.error("Database error:", error);
        throw error;
    }
}
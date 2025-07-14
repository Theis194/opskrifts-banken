import { Client } from "jsr:@db/postgres";
import { z } from "zod";
import {
    ShoppingListSchema,
    ShoppingListDetailSchema,
    ShoppingItemOutput,
    ShoppingItemSchema,
    ShoppingItemInput,
} from "./shopping-db.ts";

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

        const result = await client.queryObject<RawShoppingListDetail>(query, [
            listId,
        ]);

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
            created_at:
                row.created_at instanceof Date
                    ? row.created_at.toISOString()
                    : row.created_at,
            updated_at:
                row.updated_at instanceof Date
                    ? row.updated_at.toISOString()
                    : row.updated_at,
            is_active: row.is_active,
            total_items: Number(row.total_items),
            checked_items: Number(row.checked_items),
            contributors: contributors.map((c) => ({
                user_id: c.user_id,
                username: c.username,
                email: c.email,
                can_edit: c.can_edit,
                added_at:
                    c.added_at instanceof Date
                        ? c.added_at.toISOString()
                        : c.added_at,
                added_by: c.added_by,
            })),
            items: items.map((item) => ({
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
                added_at:
                    item.added_at instanceof Date
                        ? item.added_at.toISOString()
                        : item.added_at,
                checked_by: item.checked_by,
                checked_at:
                    item.checked_at instanceof Date
                        ? item.checked_at.toISOString()
                        : item.checked_at,
                sort_order: item.sort_order,
                notes: item.notes,
                source_recipe_id: item.source_recipe_id,
            })),
        };

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

interface ItemName {
    name: string;
}

export async function getItemNames(client: Client): Promise<string[]> {
    const query = `SELECT DISTINCT ON (lower(name)) name
    FROM (
        -- Shopping item names (using ingredient name if referenced)
        SELECT coalesce(i.name, si.item_name) AS name
        FROM shopping_items si
        LEFT JOIN ingredients i ON si.ingredient_id = i.ingredient_id
        
        UNION
        
        -- Ingredients not referenced by shopping items
        SELECT name
        FROM ingredients
        WHERE ingredient_id NOT IN (
            SELECT ingredient_id 
            FROM shopping_items 
            WHERE ingredient_id IS NOT NULL
        )
    ) combined_names
    ORDER BY lower(name);
    `;

    const result = await client.queryObject<ItemName>(query);
    const items: string[] = [];
    result.rows.forEach((row) => {
        items.push(row.name);
    });

    return items;
}

export async function addItemToList(client: Client, input: ShoppingItemInput) {
    const validated = ShoppingItemSchema.parse(input);

    const userResult = await client.queryObject<{ user_id: number }>(
        `SELECT user_id FROM users WHERE username = $1`,
        [validated.addedBy]
    );

    if (userResult.rows.length === 0) {
        throw new Error("User not found");
    }

    const userId = userResult.rows[0].user_id;
    try {
        await client.queryObject(`BEGIN`);

        const itemId = await findOrCreateShoppingItem(
            client,
            validated.itemName
        );

        const result = await client.queryObject<{ list_item_id: number }>(
            `INSERT INTO shopping_list_items (
        list_id, item_id, quantity, unit, added_by, added_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING list_item_id`,
            [
                validated.listId,
                itemId,
                validated.quantity,
                validated.unit,
                userId,
            ]
        );

        // Update list updated_at
        await client.queryObject(
            `UPDATE shopping_lists 
       SET updated_at = NOW() 
       WHERE list_id = $1`,
            [validated.listId]
        );

        await client.queryObject("COMMIT");

        return {
            success: true,
            listItemId: result.rows[0].list_item_id,
        };
    } catch (error) {
        await client.queryObject(`ROLLBACK`);
        throw error;
    }
}

export async function removeItemFromList(
    client: Client,
    input: ShoppingItemInput
) {
    const validated = ShoppingItemSchema.parse(input);

    try {
        await client.queryObject(`BEGIN`);

        // Get user id
        const userResult = await client.queryObject<{ user_id: number }>(
            `SELECT user_id FROM users WHERE username = $1`,
            [validated.addedBy]
        );

        if (userResult.rows.length === 0) {
            throw new Error("User not found");
        }
        const userId = userResult.rows[0].user_id;

        // Find the item
        const itemResult = await client.queryObject<{ item_id: number }>(
            `SELECT item_id FROM shopping_items 
       WHERE item_name = $1`,
            [validated.itemName]
        );

        if (itemResult.rows.length === 0) {
            throw new Error("Item not found in catalog");
        }
        const itemId = itemResult.rows[0].item_id;

        // Delete the specific item
        const deleteResult = await client.queryObject<{ list_item_id: number }>(
            `DELETE FROM shopping_list_items
       WHERE list_id = $1
       AND item_id = $2
       AND quantity = $3
       AND unit = $4
       AND added_by = $5
       RETURNING list_item_id`,
            [
                validated.listId,
                itemId,
                validated.quantity,
                validated.unit,
                userId,
            ]
        );

        if (deleteResult.rows.length === 0) {
            throw new Error("No matching item found in the shopping list");
        }

        await client.queryObject(
            `UPDATE shopping_lists 
       SET updated_at = NOW() 
       WHERE list_id = $1`,
            [validated.listId]
        );

        await client.queryObject("COMMIT");

        return {
            success: true,
            removedItemId: deleteResult.rows[0].list_item_id,
        };
    } catch (error) {
        await client.queryObject(`ROLLBACK`);
        throw error;
    }
}

async function findOrCreateShoppingItem(
    client: Client,
    itemName: string
): Promise<number> {
    const ingredientResult = await client.queryObject<{
        ingredient_id: number;
    }>(`SELECT ingredient_id FROM ingredients WHERE name = $1`, [itemName]);

    // Check if itemName already exists in shopping items, if not create a new entry
    if (ingredientResult.rows.length > 0) {
        const existingItem = await client.queryObject<{ item_id: number }>(
            `SELECT item_id FROM shopping_items WHERE ingredient_id = $1`,
            [ingredientResult.rows[0].ingredient_id]
        );

        if (existingItem.rows.length > 0) {
            return existingItem.rows[0].item_id;
        }

        const newItem = await client.queryObject<{ item_id: number }>(
            `INSERT INTO shopping_items (item_name, item_type, ingredient_id)
       VALUES ($1, 'ingredient', $2)
       RETURNING item_id`,
            [itemName, ingredientResult.rows[0].ingredient_id]
        );
        return newItem.rows[0].item_id;
    }

    // Not an ingredient - check if we have a generic shopping item
    const genericItem = await client.queryObject<{ item_id: number }>(
        `SELECT item_id FROM shopping_items 
     WHERE item_name = $1 AND item_type = 'generic'`,
        [itemName]
    );

    if (genericItem.rows.length > 0) {
        return genericItem.rows[0].item_id;
    }

    // Create a new generic item
    const newGenericItem = await client.queryObject<{ item_id: number }>(
        `INSERT INTO shopping_items (item_name, item_type)
     VALUES ($1, 'generic')
     RETURNING item_id`,
        [itemName]
    );
    return newGenericItem.rows[0].item_id;
}

export async function userCanEdit(
    client: Client,
    listId: number,
    userId: number
): Promise<boolean> {
    // Check if user is the author
    const authorCheck = await client.queryObject<{ author_id: number }>(
        `SELECT author_id FROM shopping_lists 
     WHERE list_id = $1`,
        [listId]
    );

    if (authorCheck.rows.length === 0) {
        throw new Error("Shopping list not found");
    }

    // Return true if user is the author
    if (authorCheck.rows[0].author_id === userId) {
        return true;
    }

    // Check contributor permissions
    const contributorCheck = await client.queryObject<{ can_edit: boolean }>(
        `SELECT can_edit FROM shopping_list_contributors 
     WHERE list_id = $1 AND user_id = $2`,
        [listId, userId]
    );

    // Return true if user is a contributor with edit permissions
    return (
        contributorCheck.rows.length > 0 && contributorCheck.rows[0].can_edit
    );
}

export async function createNewList(
    client: Client,
    listName: string,
    userId: number
): Promise<{ success: boolean; listId: number; message: string }> {
    try {
        client.queryObject(`BEGIN`);

        const existingList = await client.queryObject<{ list_id: number }>(
            `SELECT list_id FROM shopping_lists 
             WHERE list_name = $1 AND author_id = $2`,
            [listName, userId]
        );

        if (existingList.rows.length > 0) {
          await client.queryObject(`COMMIT`)
            return {
                success: false,
                listId: existingList.rows[0].list_id,
                message: "You already have a list with this name",
            };
        }

        const listResult = await client.queryObject<{ list_id: number }>(
            `INSERT INTO shopping_lists (list_name, author_id)
            VALUES ($1, $2)
            RETURNING list_id`,
            [listName, userId]
        );
        const newListId = listResult.rows[0].list_id;

        await client.queryObject(`COMMIT`);

        return {
            success: true,
            listId: newListId,
            message: "Shopping list created successfully",
        };
    } catch (error) {
        await client.queryObject(`ROLLBACK`);
        throw error;
    }
}

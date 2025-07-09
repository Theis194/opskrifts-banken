import { z } from "zod";

export const ShoppingListItemSchema = z.object({
    list_item_id: z.number().nullable(),
    item_id: z.number().nullable(),
    item_name: z.string().nullable(),
    description: z.string().nullable(),
    item_type: z.enum(["generic", "ingredient"]).nullable(),
    ingredient_id: z.number().nullable(),
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
    is_checked: z.boolean().nullable(),
    added_by: z.number().nullable(),
    added_at: z
        .union([z.string(), z.date()])
        .transform((val) => (val instanceof Date ? val.toISOString() : val))
        .nullable(),
    checked_by: z.number().nullable(),
    checked_at: z
        .union([z.string(), z.date()])
        .transform((val) =>
            val === null ? null : val instanceof Date ? val.toISOString() : val
        )
        .nullable(),
    sort_order: z.number().nullable(),
    notes: z.string().nullable(),
    source_recipe_id: z.number().nullable(),
});

export const ShoppingListSchema = z.object({
    list_id: z.number(),
    list_name: z.string(),
    author_id: z.number(),
    created_at: z
        .union([z.string(), z.date()])
        .transform((val) => (val instanceof Date ? val.toISOString() : val)),
    updated_at: z
        .union([z.string(), z.date()])
        .transform((val) => (val instanceof Date ? val.toISOString() : val)),
    is_active: z.boolean(),
    is_owner: z.boolean(),
    can_edit: z.boolean().nullable(),
    total_items: z
        .number()
        .or(z.bigint())
        .transform((val) => Number(val)), // Handle both number and bigint
    checked_items: z
        .number()
        .or(z.bigint())
        .transform((val) => Number(val)), // Handle both number and bigint
    items: z.array(ShoppingListItemSchema),
});

export const ContributorSchema = z.object({
    user_id: z.number(),
    username: z.string(),
    email: z.string(),
    can_edit: z.boolean(),
    added_at: z.string(),
    added_by: z.number(),
});

export const ShoppingListDetailSchema = z.object({
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

export type ShoppingList = z.infer<typeof ShoppingListSchema>;
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;
export type Contributor = z.infer<typeof ContributorSchema>;
export type ShoppingListDetail = z.infer<typeof ShoppingListDetailSchema>;

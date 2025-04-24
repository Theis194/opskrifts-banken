import { X509Certificate } from "node:crypto";
import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string(),
  icon: z.string(),
});

export const TagSchema = z.object({
  name: z.string(),
  color: z.string(),
});

export const RecipeSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  prepTime: z.number().nonnegative(),
  cookTime: z.number().nonnegative(),
  servings: z.number().positive(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  coverImage: z.string().optional(), // Removed URL validation
  author: z.string().min(1),
  categories: z.array(CategorySchema),
  tags: z.array(TagSchema),
  createdAt: z.string().optional(), // Removed datetime validation or use coerce
  updatedAt: z.string().optional(), // Removed datetime validation or use coerce
});

export const RecentRecipeSchema = z.object({
  title: z.string().min(1),
  prepTime: z.number().nonnegative(),
  addedAgo: z.string(), // You could add a regex if you want to validate format
  categories: z.array(CategorySchema),
});

/* one row from the DB */
export const IngredientNameArraySchema = z.array(z.string().min(1));
export const CategoriNameArraySchema = z.array(CategorySchema);
export const TagNameArraySchema = z.array(TagSchema);

export type IngredientNameArray = z.infer<typeof IngredientNameArraySchema>;
export type CategoriNameArray = z.infer<typeof CategoriNameArraySchema>;
export type TagNameArray = z.infer<typeof TagNameArraySchema>;

export type Recipe = z.infer<typeof RecipeSchema>;
export type RecentRecipe = z.infer<typeof RecentRecipeSchema>;

import { z } from "zod";

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
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().optional(), // Removed datetime validation or use coerce
  updatedAt: z.string().optional(), // Removed datetime validation or use coerce
});

export type Recipe = z.infer<typeof RecipeSchema>;

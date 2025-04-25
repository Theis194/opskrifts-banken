import { z } from "zod";

const IngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  unit: z.string(),
  notes: z.string().optional().default(""),
});

const InstructionSchema = z.object({
  text: z.string().min(1),
});

export const RecipeSchema = z.object({
  title: z.string().min(1),
  cover_image: z.string().optional().default(""),
  description: z.string().min(1),
  prepTime: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  cookTime: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  servings: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  difficulty: z.string().min(1),
  categories: z.array(z.string().min(1)).optional().default([]),
  tags: z.array(z.string().min(1)).optional().default([]),
  ingredients: z.array(IngredientSchema).min(1),
  instructions: z.array(InstructionSchema).min(1),
});

export type Recipe = z.infer<typeof RecipeSchema>;
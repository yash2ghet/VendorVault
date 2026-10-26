import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  parentCategory: z.string().nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

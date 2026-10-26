import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().min(3).max(50),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  brandId: z.string(),
  categoryId: z.string(),
  vendorId: z.string(),
  description: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.output<typeof createProductSchema>;

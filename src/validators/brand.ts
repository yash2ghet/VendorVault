import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(2).max(100),
  logo: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const updateBrandSchema = createBrandSchema.partial();

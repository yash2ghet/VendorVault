import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  companyName: z.string().min(2).max(200),
  gstNumber: z.string().min(5).max(30),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().default("India"),
});

export const updateVendorSchema = createVendorSchema.partial();

export const verifyVendorSchema = z.object({
  verificationStatus: z.enum(["PENDING", "VERIFIED", "FLAGGED", "SUSPENDED"]),
  notes: z.string().optional(),
});

export type CreateVendorInput = z.output<typeof createVendorSchema>;
export type UpdateVendorInput = z.output<typeof updateVendorSchema>;

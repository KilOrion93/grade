import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court (min. 6 caractères)"),
});

export const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (min. 8 caractères)"),
  name: z.string().min(2, "Nom trop court"),
  restaurantName: z.string().min(2, "Nom du restaurant trop court"),
});

export const reviewSchema = z.object({
  visitTokenId: z.string().min(1),
  restaurantId: z.string().min(1),
  overallScore: z.number().min(1).max(5),
  criteria: z.record(z.string(), z.number().int().min(1).max(5)),
  comment: z.string().max(2000).optional(),
  visibilityType: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
});

export const tokenGenerationSchema = z.object({
  restaurantId: z.string().min(1),
  count: z.number().int().min(1).max(100).default(10),
  expiresInHours: z.number().int().min(1).max(720).default(48),
});

export const restaurantUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type TokenGenerationInput = z.infer<typeof tokenGenerationSchema>;
export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;

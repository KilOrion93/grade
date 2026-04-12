"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createRestaurantSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  address: z.string().min(5, "Une adresse complète est requise"),
  description: z.string().optional(),
});

export async function createRestaurantAction(data: z.infer<typeof createRestaurantSchema>) {
  const session = await getSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const parsed = createRestaurantSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Generate slug
  let slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) slug = "restaurant";
  
  // Ensure unique slug
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const exists = await db.restaurant.findUnique({ where: { slug: uniqueSlug } });
    if (!exists) break;
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  try {
    const restaurant = await db.restaurant.create({
      data: {
        name: parsed.data.name,
        address: parsed.data.address,
        description: parsed.data.description,
        slug: uniqueSlug,
        isActive: true,
        memberships: {
          create: {
            userId: session.userId,
            role: "OWNER",
          }
        }
      }
    });

    await logAudit({
      userId: session.userId,
      action: "restaurant.create",
      entity: "restaurant",
      entityId: restaurant.id,
      metadata: { name: restaurant.name, slug: restaurant.slug },
    });

    return { success: true, restaurantId: restaurant.id };
  } catch (error) {
    console.error("Failed to create restaurant:", error);
    return { success: false, error: "Erreur lors de la création du restaurant" };
  }
}

"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createBusinessSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  address: z.string().min(5, "Une adresse complète est requise"),
  description: z.string().optional(),
});

export async function createBusinessAction(data: z.infer<typeof createBusinessSchema>) {
  const session = await getSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const parsed = createBusinessSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) slug = "business";

  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const existingBusiness = await db.business.findUnique({ where: { slug: uniqueSlug } });
    if (!existingBusiness) break;
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  try {
    const business = await db.business.create({
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
          },
        },
      },
    });

    await logAudit({
      userId: session.userId,
      action: "business.create",
      entity: "business",
      entityId: business.id,
      metadata: { name: business.name, slug: business.slug },
    });

    return { success: true, businessId: business.id };
  } catch (error) {
    console.error("Failed to create business:", error);
    return { success: false, error: "Erreur lors de la création du business" };
  }
}

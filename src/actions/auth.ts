"use server";

import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || !user.isActive) {
    return { success: false, error: "Email ou mot de passe incorrect" };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Email ou mot de passe incorrect" };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  await logAudit({
    userId: user.id,
    action: "user.login",
    entity: "user",
    entityId: user.id,
  });

  if (user.role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/dashboard");
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
    restaurantName: formData.get("restaurantName") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { success: false, error: "Cet email est déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const slug = slugify(parsed.data.restaurantName);

  const existingSlug = await db.restaurant.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    return {
      success: false,
      error: "Un restaurant avec un nom similaire existe déjà",
    };
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: "OWNER",
    },
  });

  const restaurant = await db.restaurant.create({
    data: {
      name: parsed.data.restaurantName,
      slug,
    },
  });

  await db.staffMembership.create({
    data: {
      userId: user.id,
      restaurantId: restaurant.id,
      role: "OWNER",
    },
  });

  await logAudit({
    userId: user.id,
    action: "user.register",
    entity: "user",
    entityId: user.id,
    metadata: { restaurantId: restaurant.id },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

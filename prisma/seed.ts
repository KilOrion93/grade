import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data
  await prisma.reviewFlag.deleteMany();
  await prisma.reviewCriterionScore.deleteMany();
  await prisma.review.deleteMany();
  await prisma.visitToken.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.staffMembership.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Cleaned existing data");

  // Create subscription plans (using new structured schema)
  const starterPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Starter",
      price: 0,
      maxRestaurants: 1,
      maxTokensPerMonth: 50,
      hasAnalytics: true,
      hasAiSummary: false,
      hasPosIntegration: false,
      hasDedicatedApi: false,
      hasPrioritySupport: false,
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Pro",
      price: 29,
      maxRestaurants: 3,
      maxTokensPerMonth: 500,
      hasAnalytics: true,
      hasAiSummary: true,
      hasPosIntegration: false,
      hasDedicatedApi: false,
      hasPrioritySupport: true,
    },
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: "Enterprise",
      price: 99,
      maxRestaurants: -1,
      maxTokensPerMonth: -1,
      hasAnalytics: true,
      hasAiSummary: true,
      hasPosIntegration: true,
      hasDedicatedApi: true,
      hasPrioritySupport: true,
    },
  });

  console.log("✅ Created structured subscription plans");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@trustreview.com",
      passwordHash: adminHash,
      name: "Super Admin",
      role: "ADMIN",
    },
  });

  console.log("✅ Created admin: admin@trustreview.com / admin123");

  // Create owner user
  const ownerHash = await bcrypt.hash("owner123", 12);
  const owner = await prisma.user.create({
    data: {
      email: "marie@lebistrot.fr",
      passwordHash: ownerHash,
      name: "Marie Dupont",
      role: "OWNER",
    },
  });

  console.log("✅ Created owner: marie@lebistrot.fr / owner123");

  // Create second owner
  const owner2Hash = await bcrypt.hash("owner123", 12);
  const owner2 = await prisma.user.create({
    data: {
      email: "pierre@sushi-zen.fr",
      passwordHash: owner2Hash,
      name: "Pierre Martin",
      role: "OWNER",
    },
  });

  console.log("✅ Created owner: pierre@sushi-zen.fr / owner123");

  // Create subscription
  const subscription = await prisma.subscription.create({
    data: {
      planId: proPlan.id,
      status: "active",
      startDate: new Date(),
    },
  });

  // Create restaurants
  const bistrot = await prisma.restaurant.create({
    data: {
      name: "Le Bistrot Parisien",
      slug: "le-bistrot-parisien",
      address: "42 rue de la Paix, 75002 Paris",
      phone: "01 42 68 12 34",
      website: "https://lebistrotparisien.fr",
      subscriptionId: subscription.id,
    },
  });

  const sushi = await prisma.restaurant.create({
    data: {
      name: "Sushi Zen",
      slug: "sushi-zen",
      address: "15 rue du Temple, 75003 Paris",
      phone: "01 45 78 90 12",
    },
  });

  console.log("✅ Created restaurants: Le Bistrot Parisien, Sushi Zen");

  // Create memberships
  await prisma.staffMembership.create({
    data: { userId: owner.id, restaurantId: bistrot.id, role: "OWNER" },
  });

  await prisma.staffMembership.create({
    data: { userId: owner2.id, restaurantId: sushi.id, role: "OWNER" },
  });

  // Give Marie access to both restaurants
  await prisma.staffMembership.create({
    data: { userId: owner.id, restaurantId: sushi.id, role: "MANAGER" },
  });

  console.log("✅ Created staff memberships");

  // Create QR codes
  await prisma.qrCode.create({
    data: {
      restaurantId: bistrot.id,
      url: "http://localhost:3000/r/le-bistrot-parisien/review",
      label: "QR Principal",
    },
  });

  // Create visit tokens (some used, some available)
  const tokenData = [];
  const usedTokens = [];
  const criteria = ["accueil", "hygiene", "rapidite", "prix", "qualite"];

  // Create 20 available tokens for Le Bistrot
  for (let i = 0; i < 20; i++) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let j = 0; j < 6; j++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    tokenData.push({
      token,
      restaurantId: bistrot.id,
      isUsed: false,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
  }

  // Create 15 used tokens (for seeding reviews)
  for (let i = 0; i < 15; i++) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let j = 0; j < 6; j++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    usedTokens.push({
      token,
      restaurantId: bistrot.id,
      isUsed: true,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }

  // Create 5 tokens for Sushi Zen
  for (let i = 0; i < 5; i++) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let j = 0; j < 6; j++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    tokenData.push({
      token,
      restaurantId: sushi.id,
      isUsed: false,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
  }

  await prisma.visitToken.createMany({ data: [...tokenData, ...usedTokens] });
  console.log("✅ Created visit tokens");

  // Create reviews for used tokens
  const comments = [
    "Excellent repas, le service était impeccable ! Je recommande vivement.",
    "Bonne cuisine mais un peu d'attente au moment du dessert.",
    "Cadre agréable et plats savoureux. Nous reviendrons avec plaisir.",
    "Rapport qualité-prix correct mais rien d'exceptionnel.",
    "Un vrai régal ! Les pâtes carbonara sont les meilleures de Paris.",
    "Service rapide et efficace. Personnel très aimable.",
    "Petite déception sur la propreté des toilettes, mais le repas était bon.",
    "Ambiance chaleureuse, carte variée. Un must pour les amateurs de cuisine française.",
    null,
    "Très bon restaurant, les enfants ont adoré !",
    "La qualité des produits est vraiment au rendez-vous.",
    null,
    "Service un peu lent ce soir-là mais la nourriture compensait largement.",
    "Superbe découverte ! Merci pour cette expérience culinaire.",
    "Correct, sans plus. Je m'attendais à mieux vu les avis en ligne.",
  ];

  const createdTokens = await prisma.visitToken.findMany({
    where: { isUsed: true, restaurantId: bistrot.id },
    orderBy: { createdAt: "asc" },
  });

  for (let i = 0; i < createdTokens.length; i++) {
    const token = createdTokens[i];
    const overall = Math.floor(Math.random() * 3) + 3; // 3-5
    const createdAt = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    );

    const review = await prisma.review.create({
      data: {
        restaurantId: bistrot.id,
        visitTokenId: token.id,
        overallScore: overall,
        comment: comments[i] || null,
        visibilityType: Math.random() > 0.2 ? "PUBLIC" : "PRIVATE",
        moderationStatus:
          Math.random() > 0.15
            ? "PUBLISHED"
            : Math.random() > 0.5
              ? "PENDING"
              : "FLAGGED",
        trustScore: 60 + Math.floor(Math.random() * 40),
        ipHash: Math.random().toString(36).substring(2, 8),
        createdAt,
        updatedAt: createdAt,
        criterionScores: {
          create: criteria.map((name) => ({
            criterionName: name,
            score: Math.max(1, Math.min(5, overall + Math.floor(Math.random() * 3) - 1)),
          })),
        },
      },
    });

    // Randomly flag some reviews
    if (Math.random() > 0.85) {
      await prisma.reviewFlag.create({
        data: {
          reviewId: review.id,
          reason: "Contenu potentiellement inapproprié",
        },
      });
    }
  }

  console.log("✅ Created 15 demo reviews with criterion scores");

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "user.login",
        entity: "user",
        entityId: admin.id,
      },
      {
        userId: owner.id,
        action: "user.register",
        entity: "user",
        entityId: owner.id,
        metadata: { restaurantId: bistrot.id },
      },
      {
        userId: owner.id,
        action: "token.generate",
        entity: "restaurant",
        entityId: bistrot.id,
        metadata: { count: 20 },
      },
      {
        userId: owner.id,
        action: "qrcode.create",
        entity: "qrcode",
        entityId: bistrot.id,
      },
    ],
  });

  console.log("✅ Created audit logs");

  console.log("\n🎉 Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Demo accounts:");
  console.log("  Admin:  admin@trustreview.fr / admin123");
  console.log("  Owner:  marie@lebistrot.fr / owner123");
  console.log("  Owner2: pierre@sushi-zen.fr / owner123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Restaurant URLs:");
  console.log("  http://localhost:3000/r/le-bistrot-parisien");
  console.log("  http://localhost:3000/r/sushi-zen");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

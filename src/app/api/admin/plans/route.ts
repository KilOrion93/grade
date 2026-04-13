import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const defaultPlans = [
  {
    name: "Starter",
    price: 0,
    maxBusinesses: 1,
    maxTokensPerMonth: 50,
    hasAnalytics: true,
    hasAiSummary: false,
    hasPosIntegration: false,
    hasDedicatedApi: false,
    hasPrioritySupport: false,
  },
  {
    name: "Pro",
    price: 29,
    maxBusinesses: 3,
    maxTokensPerMonth: 500,
    hasAnalytics: true,
    hasAiSummary: true,
    hasPosIntegration: false,
    hasDedicatedApi: false,
    hasPrioritySupport: true,
  },
  {
    name: "Enterprise",
    price: 99,
    maxBusinesses: -1,
    maxTokensPerMonth: -1,
    hasAnalytics: true,
    hasAiSummary: true,
    hasPosIntegration: true,
    hasDedicatedApi: true,
    hasPrioritySupport: true,
  }
];

// GET /api/admin/plans
export async function GET() {
  try {
    await requireAdmin();

    let plans = await db.subscriptionPlan.findMany({
      orderBy: { price: "asc" }
    });

    // Seeding if empty
    if (plans.length === 0) {
      await db.subscriptionPlan.createMany({
        data: defaultPlans
      });
      plans = await db.subscriptionPlan.findMany({
        orderBy: { price: "asc" }
      });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/plans
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { 
      id, 
      name, 
      price, 
      maxBusinesses, 
      maxTokensPerMonth, 
      hasAiSummary, 
      hasAnalytics, 
      hasPosIntegration, 
      hasDedicatedApi, 
      hasPrioritySupport 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: { 
        name, 
        price: parseFloat(price), 
        maxBusinesses: parseInt(maxBusinesses),
        maxTokensPerMonth: parseInt(maxTokensPerMonth),
        hasAiSummary: !!hasAiSummary,
        hasAnalytics: !!hasAnalytics,
        hasPosIntegration: !!hasPosIntegration,
        hasDedicatedApi: !!hasDedicatedApi,
        hasPrioritySupport: !!hasPrioritySupport
      }
    });

    await logAudit({
      userId: session.userId,
      action: "plan.update",
      entity: "subscriptionPlan",
      entityId: id,
      metadata: { name, price }
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/plans
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { 
      name, 
      price, 
      maxBusinesses, 
      maxTokensPerMonth, 
      hasAiSummary, 
      hasAnalytics, 
      hasPosIntegration, 
      hasDedicatedApi, 
      hasPrioritySupport 
    } = body;

    const plan = await db.subscriptionPlan.create({
      data: { 
        name, 
        price: parseFloat(price), 
        maxBusinesses: parseInt(maxBusinesses),
        maxTokensPerMonth: parseInt(maxTokensPerMonth),
        hasAiSummary: !!hasAiSummary,
        hasAnalytics: !!hasAnalytics,
        hasPosIntegration: !!hasPosIntegration,
        hasDedicatedApi: !!hasDedicatedApi,
        hasPrioritySupport: !!hasPrioritySupport
      }
    });

    await logAudit({
      userId: session.userId,
      action: "plan.create",
      entity: "subscriptionPlan",
      entityId: plan.id,
      metadata: { name, price }
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

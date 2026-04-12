import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import DashboardShell from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin");

  const memberships = await db.staffMembership.findMany({
    where: { userId: session.userId },
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
  });

  return (
    <DashboardShell
      user={{ name: session.name, email: session.email }}
      restaurants={memberships.map((m) => m.restaurant)}
      defaultRestaurantId={memberships[0]?.restaurant.id || ""}
    >
      {children}
    </DashboardShell>
  );
}

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
    include: { business: { select: { id: true, name: true, slug: true } } },
  });

  return (
    <DashboardShell
      user={{ name: session.name, email: session.email }}
      businesses={memberships.map((m) => m.business)}
      defaultBusinessId={memberships[0]?.business.id || ""}
    >
      {children}
    </DashboardShell>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminShell user={{ name: session.name, email: session.email }}>
      {children}
    </AdminShell>
  );
}

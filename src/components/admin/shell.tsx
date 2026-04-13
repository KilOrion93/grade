"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import {
  LayoutDashboard,
  Store,
  Users,
  MessageSquare,
  ScrollText,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Store },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/moderation", label: "Modération", icon: MessageSquare },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
  { href: "/admin/plans", label: "Offres SaaS", icon: CreditCard },
];

interface Props {
  user: { name: string | null; email: string };
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="Grade Logo" 
                width={28} 
                height={28}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-xl animate-slide-in">
            <SidebarContent user={user} pathname={pathname} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-30">
        <div className="flex flex-col flex-1 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
          <SidebarContent user={user} pathname={pathname} />
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  user,
  pathname,
  onClose,
}: {
  user: Props["user"];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <Image 
            src="/logo.png" 
            alt="Grade Logo" 
            width={36} 
            height={36}
          />
          <div>
            <p className="font-bold text-sm">Grade</p>
            <p className="text-xs text-[var(--color-brand-500)] font-medium">Admin</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] px-3 py-3">
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name || "Admin"}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors rounded-lg hover:bg-[var(--color-bg-muted)] cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

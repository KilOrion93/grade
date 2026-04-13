"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import {
  LayoutDashboard,
  MessageSquare,
  QrCode,
  Ticket,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CreditCard,
} from "lucide-react";

interface Props {
  user: { name: string | null; email: string };
  businesses: { id: string; name: string; slug: string }[];
  defaultBusinessId: string;
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/reviews", label: "Avis", icon: MessageSquare },
  { href: "/dashboard/qrcodes", label: "QR Codes", icon: QrCode },
  { href: "/dashboard/tokens", label: "Tokens", icon: Ticket },
  { href: "/dashboard/billing", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export default function DashboardShell({
  user,
  businesses,
  defaultBusinessId,
  children,
}: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(defaultBusinessId);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);

  const currentBusiness = businesses.find((business) => business.id === selectedBusiness);

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
          <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[120px]">
            {currentBusiness?.name}
          </span>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-xl animate-slide-in">
            <SidebarContent
              user={user}
              businesses={businesses}
              selectedBusiness={selectedBusiness}
              currentBusiness={currentBusiness}
              pathname={pathname}
              businessDropdownOpen={businessDropdownOpen}
              setBusinessDropdownOpen={setBusinessDropdownOpen}
              setSelectedBusiness={setSelectedBusiness}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-30">
        <div className="flex flex-col flex-1 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
          <SidebarContent
            user={user}
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            currentBusiness={currentBusiness}
            pathname={pathname}
            businessDropdownOpen={businessDropdownOpen}
            setBusinessDropdownOpen={setBusinessDropdownOpen}
            setSelectedBusiness={setSelectedBusiness}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <BusinessContext.Provider value={selectedBusiness}>
            {children}
          </BusinessContext.Provider>
        </div>
      </main>
    </div>
  );
}

// Business context
export const BusinessContext = React.createContext<string>("");
export function useBusinessId() {
  return React.useContext(BusinessContext);
}

// Sidebar component extracted
function SidebarContent({
  user,
  businesses,
  selectedBusiness,
  currentBusiness,
  pathname,
  businessDropdownOpen,
  setBusinessDropdownOpen,
  setSelectedBusiness,
  onClose,
}: {
  user: Props["user"];
  businesses: Props["businesses"];
  selectedBusiness: string;
  currentBusiness: Props["businesses"][0] | undefined;
  pathname: string;
  businessDropdownOpen: boolean;
  setBusinessDropdownOpen: (v: boolean) => void;
  setSelectedBusiness: (v: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
            <p className="text-xs text-[var(--color-text-muted)]">Dashboard</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Business selector */}
      <div className="px-3 py-3 border-b border-[var(--color-border)]">
        <div className="relative">
          <button
            onClick={() =>
              setBusinessDropdownOpen(!businessDropdownOpen)
            }
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
          >
            <span className="truncate font-medium">
              {currentBusiness?.name}
            </span>
            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          {businessDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden z-10">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => {
                    setSelectedBusiness(business.id);
                    setBusinessDropdownOpen(false);
                    if (onClose) onClose();
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left hover:bg-[var(--color-bg-muted)] transition-colors cursor-pointer",
                    business.id === selectedBusiness && "bg-[var(--color-bg-muted)] font-medium"
                  )}
                >
                  {business.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
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
        
        <div className="pt-6 pb-2">
          <Link
            href="/onboarding"
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-white border border-[var(--color-border)] text-[var(--color-brand-600)] shadow-sm hover:shadow-md hover:border-[var(--color-brand-300)] transition-all"
          >
            + Nouvel établissement
          </Link>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--color-border)] px-3 py-3">
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {user.name || "Business Owner"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {user.email}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors rounded-lg hover:bg-[var(--color-bg-muted)] cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

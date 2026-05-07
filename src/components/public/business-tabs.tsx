"use client";

import { useEffect, useState } from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
}

export default function BusinessTabs({ tabs }: Props) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sections = tabs.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [tabs]);

  const handleClick = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 64 + 56; // PublicHeader (h-16) + tab bar height
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
    setActive(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav
      aria-label="Sections de la fiche"
      className="bg-white rounded-2xl border border-[var(--color-border)] sticky top-16 z-20 shadow-sm overflow-hidden"
    >
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={handleClick(tab.id)}
              className={`flex-1 min-w-[100px] py-3.5 px-2 text-sm font-bold border-b-2 transition-colors text-center whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-brand-600)] text-[var(--color-brand-600)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={`ml-1.5 text-xs font-black px-1.5 py-0.5 rounded ${
                    isActive ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]" : "text-[var(--color-text-muted)] font-medium"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

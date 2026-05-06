import Link from "next/link";
import Image from "next/image";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PublicHeaderProps {
  breadcrumbs?: Breadcrumb[];
}

export default function PublicHeader({ breadcrumbs }: PublicHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Grade" width={32} height={32} />
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/avis"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-3 py-2 rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              Annuaire
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-3 py-2 rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/login"
              className="ml-1 text-sm font-semibold text-white bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] px-4 py-2 rounded-lg transition-colors"
            >
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--color-border-hover)]">›</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--color-brand-600)] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--color-text-secondary)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

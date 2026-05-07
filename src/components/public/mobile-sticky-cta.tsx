import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  href: string;
  label: string;
  helperText?: string;
}

export default function MobileStickyCTA({ href, label, helperText }: Props) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <Link
        href={href}
        className="group flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] text-white font-bold text-sm shadow-lg shadow-[var(--color-brand-600)]/20 transition-all"
      >
        {label}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
      {helperText && (
        <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-1.5 font-medium">{helperText}</p>
      )}
    </div>
  );
}

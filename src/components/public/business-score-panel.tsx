import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

interface Props {
  avgScore: string | null;
  reviewCount: number;
  distribution: { star: number; count: number; percent: number }[];
  reviewHref: string | null;
  signupHref?: string;
  businessName: string;
  isCustomer: boolean;
}

export default function BusinessScorePanel({
  avgScore,
  reviewCount,
  distribution,
  reviewHref,
  signupHref = "/login",
  businessName,
  isCustomer,
}: Props) {
  const fullStars = avgScore ? Math.floor(parseFloat(avgScore)) : 0;
  const hasHalf = avgScore ? parseFloat(avgScore) - fullStars >= 0.25 && parseFloat(avgScore) - fullStars < 0.75 : false;

  return (
    <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xl p-6">
      {avgScore ? (
        <>
          <div className="text-center pb-5 border-b border-[var(--color-border)]">
            <div className="text-6xl font-black tabular-nums tracking-tighter text-yellow-500 leading-none">
              {avgScore}
            </div>
            <div className="flex justify-center gap-0.5 mt-3" aria-label={`Note ${avgScore} sur 5`}>
              {[0, 1, 2, 3, 4].map((i) => {
                const filled = i < fullStars;
                const half = !filled && i === fullStars && hasHalf;
                return (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      filled ? "fill-yellow-500 text-yellow-500" : half ? "fill-yellow-300 text-yellow-400" : "fill-[var(--color-border)] text-[var(--color-border)]"
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              <span className="font-bold text-[var(--color-text)]">{reviewCount}</span> {reviewCount > 1 ? "avis certifiés" : "avis certifié"}
            </p>
          </div>

          {distribution.some((d) => d.count > 0) && (
            <div className="py-5 space-y-1.5">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-bold tabular-nums">{d.star}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${d.percent}%` }}
                    />
                  </div>
                  <span className="text-[var(--color-text-muted)] w-8 text-right tabular-nums">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center pb-5">
          <div className="text-3xl mb-2">✨</div>
          <h3 className="font-bold text-[var(--color-text)]">
            {isCustomer ? "Soyez le pionnier" : "Pas encore certifié"}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {isCustomer
              ? `Aucun avis publié pour ${businessName}.`
              : `${businessName} n'utilise pas encore Grade.`}
          </p>
        </div>
      )}

      {reviewHref ? (
        <Link
          href={reviewHref}
          aria-label={`Laisser un avis pour ${businessName}`}
          className="group block w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] text-white font-bold text-center shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
        >
          Laisser un avis
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      ) : (
        <Link
          href={signupHref}
          className="group block w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] text-white font-bold text-center shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
        >
          Activer Grade
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
      <p className="text-[11px] text-[var(--color-text-muted)] text-center mt-2">
        {reviewHref ? "Reçu requis · 100% gratuit" : "Activation gratuite en 2 minutes"}
      </p>
    </div>
  );
}

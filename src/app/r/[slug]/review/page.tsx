import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import BusinessReviewFlow from "@/components/public/review-flow";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
  });

  if (!business) return { title: "Business introuvable" };

  return {
    description: `Déposez votre avis certifié pour ${business.name} à l'aide de votre Token.`,
  };
}

export default async function ReviewSubmissionPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
  });

  if (!business || !business.isActive) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <BusinessReviewFlow
        businessSlug={business.slug}
        businessName={business.name}
      />
    </main>
  );
}

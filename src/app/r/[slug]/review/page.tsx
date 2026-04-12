import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import RestaurantReviewFlow from "@/components/public/review-flow";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant) return { title: "Restaurant introuvable" };

  return {
    description: `Déposez votre avis certifié pour ${restaurant.name} à l'aide de votre Token.`,
  };
}

export default async function ReviewSubmissionPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant || !restaurant.isActive) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <RestaurantReviewFlow
        restaurantSlug={restaurant.slug}
        restaurantName={restaurant.name}
      />
    </main>
  );
}

import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, businesses] = await Promise.all([
    db.businessListing.findMany({
      select: { citySlug: true, slug: true, updatedAt: true },
    }),
    db.business.findMany({
      where: { isActive: true, citySlug: { not: null } },
      select: { citySlug: true, slug: true, updatedAt: true },
    }),
  ])

  const citySet = new Set<string>()
  listings.forEach(l => citySet.add(l.citySlug))
  businesses.forEach(b => { if (b.citySlug) citySet.add(b.citySlug) })

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/avis`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/businesses`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    ...Array.from(citySet).map(city => ({
      url: `${BASE}/avis/${city}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ]

  const businessUrls: MetadataRoute.Sitemap = businesses
    .filter(b => b.citySlug)
    .map(b => ({
      url: `${BASE}/avis/${b.citySlug}/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }))

  const listingUrls: MetadataRoute.Sitemap = listings.map(l => ({
    url: `${BASE}/avis/${l.citySlug}/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticUrls, ...businessUrls, ...listingUrls]
}

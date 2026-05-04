import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { nameToSlug } from '@/lib/slug-utils'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const city = req.nextUrl.searchParams.get('city')?.trim() || ''

  // Require either a query term OR a city — bare empty search returns nothing
  if (q.length < 2 && !city) {
    return NextResponse.json({ results: [] })
  }

  const citySlug = city ? nameToSlug(city) : undefined
  const nameFilter = q.length >= 1 ? { name: { contains: q, mode: 'insensitive' as const } } : {}

  const [listings, businesses] = await Promise.all([
    db.businessListing.findMany({
      where: {
        ...nameFilter,
        ...(citySlug ? { citySlug } : {}),
      },
      take: 50,
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, city: true, citySlug: true, category: true, address: true },
    }),
    db.business.findMany({
      where: {
        ...nameFilter,
        isActive: true,
        ...(citySlug ? { citySlug } : {}),
      },
      take: 20,
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, city: true, citySlug: true },
    }),
  ])

  const results = [
    ...businesses.map(b => ({
      name: b.name,
      slug: b.slug,
      city: b.city || '',
      citySlug: b.citySlug || '',
      isCustomer: true,
      url: b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`,
    })),
    ...listings.map(l => ({
      name: l.name,
      slug: l.slug,
      city: l.city,
      citySlug: l.citySlug,
      isCustomer: false,
      category: l.category,
      url: `/avis/${l.citySlug}/${l.slug}`,
    })),
  ]

  return NextResponse.json({ results })
}

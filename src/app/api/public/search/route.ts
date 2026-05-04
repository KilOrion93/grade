import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { nameToSlug } from '@/lib/slug-utils'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const city = req.nextUrl.searchParams.get('city')?.trim() || ''

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const citySlug = city ? nameToSlug(city) : undefined

  const [listings, businesses] = await Promise.all([
    db.businessListing.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        ...(citySlug ? { citySlug } : {}),
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, city: true, citySlug: true, category: true, address: true },
    }),
    db.business.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true,
        ...(citySlug ? { citySlug } : {}),
      },
      take: 5,
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

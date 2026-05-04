import { db } from '@/lib/db'
import { fetchOSMBusinesses } from '@/lib/osm'
import { fetchSIRENEBusinesses } from '@/lib/sirene'
import { generateBusinessSlug } from '@/lib/slug-utils'
import { ListingSource } from '@prisma/client'

const INGESTION_THRESHOLD = 10

export async function shouldIngestCity(citySlug: string): Promise<boolean> {
  const count = await db.businessListing.count({ where: { citySlug } })
  return count < INGESTION_THRESHOLD
}

async function upsertListing(data: {
  name: string
  city: string
  citySlug: string
  address?: string
  phone?: string
  website?: string
  category?: string
  source: ListingSource
  externalId: string
  lat?: number
  lng?: number
  country: string
}) {
  const baseSlug = generateBusinessSlug(data.name, data.address)

  let slug = baseSlug
  for (let attempt = 2; attempt <= 6; attempt++) {
    const existing = await db.businessListing.findUnique({
      where: { citySlug_slug: { citySlug: data.citySlug, slug } },
      select: { externalId: true, source: true },
    })
    if (!existing || (existing.source === data.source && existing.externalId === data.externalId)) break
    slug = `${baseSlug}-${attempt}`
  }

  await db.businessListing.upsert({
    where: { source_externalId: { source: data.source, externalId: data.externalId } },
    create: { ...data, slug },
    update: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      website: data.website,
      lat: data.lat,
      lng: data.lng,
    },
  })
}

export async function ingestCity(cityName: string, citySlug: string): Promise<void> {
  try {
    const [osmResults, sireneResults] = await Promise.all([
      fetchOSMBusinesses(cityName),
      fetchSIRENEBusinesses(cityName),
    ])

    for (const biz of osmResults) {
      if (!biz.name) continue
      await upsertListing({
        name: biz.name,
        city: cityName,
        citySlug,
        address: biz.address,
        phone: biz.phone,
        website: biz.website,
        category: biz.category,
        source: ListingSource.OSM,
        externalId: biz.externalId,
        lat: biz.lat,
        lng: biz.lng,
        country: 'FR',
      })
    }

    for (const biz of sireneResults) {
      if (!biz.name) continue
      await upsertListing({
        name: biz.name,
        city: biz.city || cityName,
        citySlug,
        address: biz.address,
        category: biz.category,
        source: ListingSource.SIRENE,
        externalId: biz.externalId,
        lat: biz.lat,
        lng: biz.lng,
        country: 'FR',
      })
    }
  } catch (err) {
    console.error(`[ingest] Failed for city "${cityName}":`, err)
  }
}

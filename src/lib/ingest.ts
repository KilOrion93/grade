import { db } from '@/lib/db'
import { fetchOSMBusinesses } from '@/lib/osm'
import { generateBusinessSlug } from '@/lib/slug-utils'
import { ListingSource } from '@prisma/client'

const INGESTION_THRESHOLD = 50

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

  // Find a free slug — check each candidate before trying to use it
  let slug = baseSlug
  for (let attempt = 2; attempt <= 99; attempt++) {
    const existing = await db.businessListing.findUnique({
      where: { citySlug_slug: { citySlug: data.citySlug, slug } },
      select: { externalId: true, source: true },
    })
    // Slot is free, or it's already ours — use it
    if (!existing || (existing.source === data.source && existing.externalId === data.externalId)) break
    // Slot taken by different business — try next suffix
    slug = `${baseSlug}-${attempt}`
    // Last resort: append part of externalId to guarantee uniqueness
    if (attempt === 99) slug = `${baseSlug}-${data.externalId.slice(-6)}`
  }

  try {
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
  } catch (err: any) {
    // P2002 = unique constraint — slug still collided, skip this listing
    if (err?.code !== 'P2002') throw err
  }
}

export async function ingestCity(cityName: string, citySlug: string): Promise<void> {
  try {
    const osmResults = await fetchOSMBusinesses(cityName)

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
  } catch (err) {
    console.error(`[ingest] Failed for city "${cityName}":`, err)
  }
}

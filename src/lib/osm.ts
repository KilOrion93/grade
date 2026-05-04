export interface OSMBusiness {
  externalId: string
  name: string
  address?: string
  phone?: string
  website?: string
  category: string
  lat?: number
  lng?: number
}

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json',
  'User-Agent': 'Grade/1.0 (grade.app)',
}

function formatOSMAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:postcode'],
    tags['addr:city'],
  ].filter(Boolean)
  return parts.length >= 2 ? parts.join(', ') : undefined
}

function inferCategory(tags: Record<string, string>): string {
  const shop = tags.shop
  const amenity = tags.amenity
  const tourism = tags.tourism
  const mapping: Record<string, string> = {
    car_repair: 'garage', bakery: 'boulangerie', hairdresser: 'coiffeur',
    supermarket: 'supermarché', pharmacy: 'pharmacie', restaurant: 'restaurant',
    cafe: 'café', bar: 'bar', hotel: 'hôtel', doctors: 'médecin', dentist: 'dentiste',
    clothes: 'vêtements', butcher: 'boucherie', florist: 'fleuriste',
  }
  return mapping[shop] || mapping[amenity] || mapping[tourism] || shop || amenity || tourism || 'commerce'
}

async function fetchFromMirror(url: string, query: string): Promise<any[] | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.elements ?? null
  } catch {
    return null
  }
}

// Split into 3 focused queries to avoid timeout and get real coverage
const CATEGORY_QUERIES = (cityName: string, limit: number) => [
  // Food & drink
  `[out:json][timeout:60];
(area["name"="${cityName}"]["admin_level"="8"]->.a;area["name"="${cityName}"]["admin_level"="6"]->.a;);
(nwr["name"]["amenity"~"restaurant|cafe|bar|fast_food|brasserie|bistro"](area.a););
out center ${limit};`,

  // Shops & services
  `[out:json][timeout:60];
(area["name"="${cityName}"]["admin_level"="8"]->.a;area["name"="${cityName}"]["admin_level"="6"]->.a;);
(nwr["name"]["shop"](area.a););
out center ${limit};`,

  // Health, accommodation & auto
  `[out:json][timeout:60];
(area["name"="${cityName}"]["admin_level"="8"]->.a;area["name"="${cityName}"]["admin_level"="6"]->.a;);
(
  nwr["name"]["amenity"~"pharmacy|doctors|dentist|car_repair|hospital|veterinary"](area.a);
  nwr["name"]["tourism"="hotel"](area.a);
);
out center ${limit};`,
]

function elementsToBusinesses(elements: any[]): OSMBusiness[] {
  return elements
    .filter(el => el.tags?.name)
    .map(el => ({
      externalId: `${el.id}`,
      name: el.tags.name as string,
      address: formatOSMAddress(el.tags),
      phone: el.tags['contact:phone'] || el.tags.phone,
      website: el.tags.website || el.tags['contact:website'],
      category: inferCategory(el.tags),
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
    }))
}

export async function fetchOSMBusinesses(
  cityName: string,
  limitPerCategory = 500
): Promise<OSMBusiness[]> {
  const queries = CATEGORY_QUERIES(cityName, limitPerCategory)
  const allElements: any[] = []

  for (const query of queries) {
    let fetched = false
    for (const mirror of OVERPASS_MIRRORS) {
      const elements = await fetchFromMirror(mirror, query)
      if (elements && elements.length >= 0) {
        allElements.push(...elements)
        fetched = true
        break
      }
    }
    if (!fetched) {
      console.error(`[OSM] all mirrors failed for "${cityName}" (one category batch)`)
    }
  }

  // Dedupe by OSM element ID
  const seen = new Set<string>()
  const unique = allElements.filter(el => {
    if (seen.has(`${el.id}`)) return false
    seen.add(`${el.id}`)
    return true
  })

  return elementsToBusinesses(unique)
}

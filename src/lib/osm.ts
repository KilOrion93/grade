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

// Mirrors tried in order — first success wins
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

export async function fetchOSMBusinesses(
  cityName: string,
  limit = 50
): Promise<OSMBusiness[]> {
  // admin_level 8 = French communes. Use union with boundary=administrative
  // as fallback to catch cities with non-standard admin levels (e.g. Paris = 6+8)
  const query = `
[out:json][timeout:50];
(
  area["name"="${cityName}"]["admin_level"="8"]->.a;
  area["name"="${cityName}"]["admin_level"="6"]->.a;
);
(
  nwr["name"]["shop"](area.a);
  nwr["name"]["amenity"~"restaurant|cafe|bar|pharmacy|doctors|dentist|car_repair"](area.a);
  nwr["name"]["tourism"="hotel"](area.a);
);
out center ${limit};
`

  for (const mirror of OVERPASS_MIRRORS) {
    const elements = await fetchFromMirror(mirror, query)
    if (elements && elements.length > 0) {
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
  }

  console.error(`[OSM] all mirrors failed for "${cityName}"`)
  return []
}

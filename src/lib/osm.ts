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

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter'

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

export async function fetchOSMBusinesses(
  cityName: string,
  limit = 50
): Promise<OSMBusiness[]> {
  const query = `
[out:json][timeout:30];
area["name"="${cityName}"]["admin_level"~"6|7|8"]->.searchArea;
(
  nwr["name"]["shop"](area.searchArea);
  nwr["name"]["amenity"~"restaurant|cafe|bar|pharmacy|doctors|dentist|car_repair"](area.searchArea);
  nwr["name"]["tourism"="hotel"](area.searchArea);
);
out center ${limit};
`

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Grade/1.0 (grade.app)',
      },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[OSM] fetch failed for "${cityName}": ${res.status}`)
      return []
    }

    const data = await res.json()

    return (data.elements as any[])
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
  } catch (err) {
    console.error(`[OSM] error for "${cityName}":`, err)
    return []
  }
}

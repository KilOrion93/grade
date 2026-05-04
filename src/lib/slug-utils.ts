export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function citySlugToName(slug: string): string {
  return slugToName(slug)
}

export function extractCityFromAddress(address: string): { city: string; citySlug: string } | null {
  // French postal code: "75002 Paris" or "31000 Toulouse"
  const match = address.match(/\b\d{5}\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-]+?)(?:\s*$|,)/i)
  if (match) {
    const city = match[1].trim()
    return { city, citySlug: nameToSlug(city) }
  }
  // Fallback: last comma-segment, strip leading digits
  const parts = address.split(',')
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].trim().replace(/^\d[\d\s]*/, '').trim()
    if (last.length > 1) return { city: last, citySlug: nameToSlug(last) }
  }
  return null
}

export function generateBusinessSlug(name: string, address?: string): string {
  const base = nameToSlug(name)
  if (!address) return base
  const streetMatch = address.match(/(\d+\s+)?(?:rue|avenue|boulevard|place|impasse|allee|chemin|route)\s+(.+?)(?:,|$)/i)
  if (streetMatch) {
    const street = nameToSlug(streetMatch[0])
    return `${base}-${street}`.replace(/-+/g, '-').slice(0, 80)
  }
  return base
}

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

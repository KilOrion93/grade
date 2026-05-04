export interface SIRENEBusiness {
  externalId: string
  name: string
  address?: string
  city?: string
  category?: string
  lat?: number
  lng?: number
}

const SIRENE_BASE = 'https://recherche-entreprises.api.gouv.fr'

export async function fetchSIRENEBusinesses(
  cityName: string,
  perPage = 25
): Promise<SIRENEBusiness[]> {
  const params = new URLSearchParams({
    q: cityName,
    page: '1',
    per_page: String(perPage),
  })

  try {
    const res = await fetch(`${SIRENE_BASE}/search?${params}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[SIRENE] fetch failed for "${cityName}": ${res.status}`)
      return []
    }

    const data = await res.json()

    return ((data.results as any[]) || [])
      .filter(r =>
        r.siege?.libelle_commune?.toLowerCase() === cityName.toLowerCase() &&
        (r.nom_complet || r.nom_raison_sociale)
      )
      .map(r => {
        const siege = r.siege || {}
        const streetParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean)
        return {
          externalId: r.siren,
          name: (r.nom_complet || r.nom_raison_sociale || '').trim(),
          address: streetParts.length > 0
            ? `${streetParts.join(' ')}, ${siege.code_postal || ''} ${siege.libelle_commune || ''}`.trim()
            : undefined,
          city: siege.libelle_commune,
          category: r.activite_principale_libelle,
          lat: siege.latitude ? parseFloat(siege.latitude) : undefined,
          lng: siege.longitude ? parseFloat(siege.longitude) : undefined,
        }
      })
      .filter(b => b.name.length > 0)
  } catch (err) {
    console.error(`[SIRENE] error for "${cityName}":`, err)
    return []
  }
}

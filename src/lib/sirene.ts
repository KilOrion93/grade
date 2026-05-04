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

// NAF section O = public administration (84.xx), section P = education (85.xx public)
// Filter these out along with explicitly public nature_juridique codes (7xxx)
const PUBLIC_NAF_PREFIXES = ['84', '85', '86', '87', '88', '99']
const PUBLIC_NATURE_JURIDIQUE_PREFIX = '7'

// Names that clearly indicate non-commercial public entities
const PUBLIC_NAME_KEYWORDS = [
  'tribunal', 'cour d\'appel', 'mairie', 'préfecture', 'prefecture',
  'gendarmerie', 'commissariat', 'hôpital public', 'hopital public',
  'ministère', 'ministere', 'conseil régional', 'conseil général',
  'conseil departemental', 'commune de', 'ville de', 'région ',
  'département ', 'departement ',
]

function isCommercialEntity(r: any): boolean {
  const naf = (r.activite_principale || '').slice(0, 2)
  if (PUBLIC_NAF_PREFIXES.includes(naf)) return false

  const natureJuridique = String(r.nature_juridique || '')
  if (natureJuridique.startsWith(PUBLIC_NATURE_JURIDIQUE_PREFIX)) return false

  const name = (r.nom_complet || r.nom_raison_sociale || '').toLowerCase()
  if (PUBLIC_NAME_KEYWORDS.some(kw => name.includes(kw))) return false

  return true
}

export async function fetchSIRENEBusinesses(
  cityName: string,
  perPage = 25
): Promise<SIRENEBusiness[]> {
  // Query with est_ouvert=true to get active businesses, empty q to search broadly,
  // and filter post-fetch to only keep businesses whose registered address is in this city.
  // We do NOT use q=cityName (that searches business names for the city string, not location).
  const params = new URLSearchParams({
    q: cityName,        // used as location hint — combined with commune filter below
    page: '1',
    per_page: String(perPage),
    est_ouvert: 'true', // only active businesses
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
        // Only keep businesses whose legal address (siege) is actually in this city
        r.siege?.libelle_commune?.toLowerCase() === cityName.toLowerCase() &&
        (r.nom_complet || r.nom_raison_sociale) &&
        // Filter out public entities (courts, government, schools, etc.)
        isCommercialEntity(r)
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

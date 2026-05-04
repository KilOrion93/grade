import 'dotenv/config'
import { ingestCity } from '../src/lib/ingest'

const CITIES = [
  { name: 'Paris', slug: 'paris' },
  { name: 'Lyon', slug: 'lyon' },
  { name: 'Marseille', slug: 'marseille' },
  { name: 'Bordeaux', slug: 'bordeaux' },
  { name: 'Toulouse', slug: 'toulouse' },
  { name: 'Nantes', slug: 'nantes' },
  { name: 'Strasbourg', slug: 'strasbourg' },
  { name: 'Montpellier', slug: 'montpellier' },
  { name: 'Lille', slug: 'lille' },
  { name: 'Nice', slug: 'nice' },
  { name: 'Rennes', slug: 'rennes' },
  { name: 'Bagnolet', slug: 'bagnolet' },
]

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function run() {
  for (const city of CITIES) {
    console.log(`[ingest] ${city.name}...`)
    await ingestCity(city.name, city.slug)
    console.log(`[ingest] ${city.name} done`)
    await delay(2000)
  }
  console.log('All cities ingested.')
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

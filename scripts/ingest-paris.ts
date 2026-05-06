import 'dotenv/config'
import { ingestCity } from '../src/lib/ingest'

async function run() {
  console.log('[ingest] Paris...')
  await ingestCity('Paris', 'paris')
  console.log('[ingest] Paris done')
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

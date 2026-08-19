const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

// Domain-e që përjashtohen gjithmonë — duam website zyrtarë kompanish,
// jo profile sociale (siç u kërkua qartë).
const EXCLUDED_DOMAINS = [
  'facebook.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'tiktok.com', 'twitter.com', 'x.com', 'pinterest.com',
  'wikipedia.org', 'yelp.com', 'tripadvisor.com',
]

interface CompanyResult {
  name: string
  website: string
}

// Kërkon kompani për një kategori+zonë specifike, duke përdorur Google Local
// Results përmes SerpApi (jo Google API zyrtare, që po mbyllet 2027).
export async function searchCompanies(
  industry: string,
  location: string,
  radiusKm: number,
  excludeWebsites: string[] // kompani tashmë të dërguara -> filtri anti-dublikatë
): Promise<CompanyResult[]> {
  const params = new URLSearchParams({
    engine: 'google_local',
    q: `${industry} ${location}`,
    hl: 'sq',
    api_key: SERPAPI_KEY,
  })

  const res = await fetch(`https://serpapi.com/search.json?${params}`)
  const data = await res.json()

  const results: CompanyResult[] = (data.local_results || [])
    .filter((r: any) => r.website && !isExcludedDomain(r.website))
    .filter((r: any) => !excludeWebsites.includes(normalizeUrl(r.website)))
    .map((r: any) => ({ name: r.title, website: normalizeUrl(r.website) }))

  return results
}

function isExcludedDomain(url: string): boolean {
  return EXCLUDED_DOMAINS.some((d) => url.includes(d))
}

function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

// Kur s'ka më rezultate të reja në zonë+kategori -> sinjal për të zgjeruar
// (përdoret nga cron-i ditor, shih app/api/cron/daily-leads).
export function noNewResultsMessage(industry: string, location: string, radiusKm: number) {
  return `U gjeneruan të gjitha kompanitë e gjetura për "${industry}" në ${location} (rreze ${radiusKm}km). Dëshiron të zgjerojmë rrezen, të shtojmë kategori të lidhura, apo të ndryshojmë lokacionin?`
}

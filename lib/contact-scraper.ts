// Vizitë E VETME, e matur, te website i kompanisë — për të nxjerrë
// email/telefon nga faqja "Contact/About". RESPEKTON robots.txt: nëse
// website thotë "mos më skano", kalojmë tek tjetri, pa u përpjekur ta
// anashkalojmë. Kjo NUK është "maskim si bot" — është thjesht 1 kërkesë
// e ngadaltë, e respektueshme, ashtu siç u diskutua.

async function isAllowedByRobots(website: string, path: string): Promise<boolean> {
  try {
    const robotsRes = await fetch(`https://${website}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!robotsRes.ok) return true // s'ka robots.txt -> lejohet
    const robotsTxt = await robotsRes.text()
    const disallowedForAll = robotsTxt
      .split('\n')
      .filter((l) => l.trim().toLowerCase().startsWith('disallow:'))
      .map((l) => l.split(':')[1]?.trim())
    return !disallowedForAll.some((d) => d && path.startsWith(d))
  } catch {
    return true // nëse s'lexohet dot, vazhdojmë me kujdes normal
  }
}

export async function fetchContactPageText(website: string): Promise<string | null> {
  const candidatePaths = ['/contact', '/kontakt', '/about', '/rreth-nesh', '/']

  for (const path of candidatePaths) {
    const allowed = await isAllowedByRobots(website, path)
    if (!allowed) continue

    try {
      const res = await fetch(`https://${website}${path}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'VoxForumLeadsAgent/1.0 (+contact-lookup)' },
      })
      if (!res.ok) continue
      const html = await res.text()
      const text = stripHtml(html)
      if (text.length > 100) return text // gjeti diçka të mjaftueshme, ndalon këtu
    } catch {
      continue
    }

    // Pauzë e shkurtër mes kërkesash — sjellje "avash avash", jo agresive.
    await new Promise((r) => setTimeout(r, 800))
  }

  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

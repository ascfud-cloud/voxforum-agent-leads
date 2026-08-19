import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Thirret nga forma e thjeshtë te dashboard (app/dashboard) kur ti, admini,
// shton një sponsor pas nënshkrimit të kontratës. Kjo ËSHTË e vetmja mënyrë
// si një email/domain merr shërbimin "sponsor_included" — kurrë automatike.
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.ADMIN_DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { companyName, contactEmail, emailDomain, hasLeadsIncluded, yearlyPriceEur, notes } = await req.json()

  const sponsor = await prisma.sponsorAccount.create({
    data: { companyName, contactEmail, emailDomain, hasLeadsIncluded, yearlyPriceEur, notes },
  })

  return NextResponse.json({ ok: true, sponsor })
}

export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.ADMIN_DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const sponsors = await prisma.sponsorAccount.findMany({ orderBy: { addedByAdminAt: 'desc' } })
  return NextResponse.json({ sponsors })
}

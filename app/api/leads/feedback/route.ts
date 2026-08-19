import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyAdmin } from '@/lib/notify'

// I thirrur nga klikimi i një linku te email-i ditor: /feedback?...&outcome=converted
export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get('participant')
  const company = req.nextUrl.searchParams.get('company')
  const outcome = req.nextUrl.searchParams.get('outcome') // relevant | not_relevant | converted | no_response

  if (!participantId || !company || !outcome) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({
    where: { participantId, website: company },
    orderBy: { sentAt: 'desc' },
  })
  if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 })

  await prisma.feedback.upsert({
    where: { leadId: lead.id },
    create: { leadId: lead.id, outcome },
    update: { outcome },
  })

  await prisma.lead.update({ where: { id: lead.id }, data: { status: outcome } })

  if (outcome === 'converted') {
    await notifyAdmin(participantId, 'converted', 'info', `${company} u konvertua! 🎉`)
  }

  // Faqe konfirmimi shumë e thjeshtë — jo redirect drejt aplikacionit.
  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>Faleminderit për feedback-un!</h2>
      <p>U ruajt: <strong>${outcome}</strong> për ${company}.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

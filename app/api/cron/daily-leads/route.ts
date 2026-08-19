import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchCompanies, noNewResultsMessage } from '@/lib/serpapi'
import { fetchContactPageText } from '@/lib/contact-scraper'
import { extractContactFromPageText } from '@/lib/groq'
import { sendDailyLeadsEmail, sendNoResultsEmail, sendTrialEndingSoonEmail, sendTrialExpiredOfferEmail } from '@/lib/resend'
import { checkNoFeedbackStreak, notifyAdmin } from '@/lib/notify'

const LEADS_PER_DAY_MAX = 3

// Aktivizohet çdo ditë nga Vercel Cron (shih vercel.json). Kërkon header-in
// e sekretit të cron-it, që s'lidhet fare me sekretin e VoxForum.
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const activeParticipants = await prisma.trialParticipant.findMany({
    where: { status: { in: ['active'] } },
    include: { serviceProfile: true },
  })

  for (const participant of activeParticipants) {
    await handleTrialLifecycle(participant)

    if (!participant.serviceProfile || !participant.serviceProfile.location) {
      continue // ende s'ka vendosur lokacionin, s'kërkojmë ende
    }

    await sendDailyLeadsForParticipant(participant, participant.serviceProfile)
  }

  return NextResponse.json({ ok: true, processed: activeParticipants.length })
}

async function sendDailyLeadsForParticipant(participant: any, profile: any) {
  const alreadySent = await prisma.lead.findMany({
    where: { participantId: participant.participantId },
    select: { website: true },
  })
  const alreadySentWebsites = alreadySent.map((l) => l.website)

  const foundLeads: any[] = []

  for (const industry of profile.targetIndustries) {
    if (foundLeads.length >= LEADS_PER_DAY_MAX) break

    const companies = await searchCompanies(
      industry,
      profile.location,
      profile.locationRadiusKm,
      alreadySentWebsites
    )

    for (const company of companies) {
      if (foundLeads.length >= LEADS_PER_DAY_MAX) break

      const pageText = await fetchContactPageText(company.website)
      if (!pageText) continue // s'ka faqe kontakti të lexueshme -> kalojmë

      const contact = await extractContactFromPageText(pageText)
      if (contact.emails.length === 0 && contact.phones.length === 0) continue // duam vetëm rezultate me kontakt real

      const best = pickBestContact(contact.emails)

      foundLeads.push({
        companyName: company.name,
        website: company.website,
        contactEmail: best?.address ?? null,
        contactPhone: contact.phones[0] ?? null,
        contactPersonName: contact.contactPersonName,
        contactSource: best?.role ?? 'form_only',
        industryMatched: industry,
        reasonMatched: `Operon në "${industry}", relevante për shërbimin: ${profile.serviceSummary}`,
      })
    }
  }

  if (foundLeads.length === 0) {
    await sendNoResultsEmail(
      participant.email,
      participant.name,
      noNewResultsMessage(profile.targetIndustries[0], profile.location, profile.locationRadiusKm)
    )
    return
  }

  await prisma.lead.createMany({
    data: foundLeads.map((l) => ({ ...l, participantId: participant.participantId })),
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  await sendDailyLeadsEmail(
    participant.email,
    participant.name,
    foundLeads.map((l) => ({
      ...l,
      feedbackUrl: `${appUrl}/feedback?participant=${participant.participantId}&company=${encodeURIComponent(l.website)}`,
      agentContactUrl: `${appUrl}/agent-contact?participant=${participant.participantId}&company=${encodeURIComponent(l.website)}`,
    }))
  )

  await checkNoFeedbackStreak(participant.participantId)
}

// Prioriteti i kontaktit: manager/admin para gjenerikut (info@/office@) —
// siç u kërkua eksplicit.
function pickBestContact(emails: { address: string; role: string }[]) {
  return (
    emails.find((e) => e.role === 'manager') ||
    emails.find((e) => e.role === 'admin') ||
    emails.find((e) => e.role === 'generic') ||
    null
  )
}

async function handleTrialLifecycle(participant: any) {
  const now = new Date()
  const daysLeft = Math.ceil((participant.trialEndsAt.getTime() - now.getTime()) / 86_400_000)

  if (daysLeft === 5 || daysLeft === 3) {
    const stats = await getStats(participant.participantId)
    await sendTrialEndingSoonEmail(participant.email, participant.name, stats)
    await notifyAdmin(participant.participantId, 'trial_ending_soon', 'warning', `Trial mbaron pas ${daysLeft} ditësh.`)
  }

  if (daysLeft <= 0 && participant.status === 'active') {
    const stats = await getStats(participant.participantId)
    await sendTrialExpiredOfferEmail(participant.email, participant.name, stats)
    await prisma.trialParticipant.update({
      where: { id: participant.id },
      data: { status: 'expired' },
    })
  }
}

async function getStats(participantId: string) {
  const leads = await prisma.lead.findMany({ where: { participantId }, include: { feedback: true } })
  return {
    totalLeads: leads.length,
    converted: leads.filter((l) => l.feedback?.outcome === 'converted').length,
  }
}

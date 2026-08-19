import { prisma } from './prisma'

interface PlanDecision {
  plan: 'trial' | 'sponsor_included'
  trialEndsAt: Date | null // null = pa afat, për sponsorët
}

// Thirret NJË herë, kur një pjesëmarrës hyn për herë të parë në sistemin
// e Agjentit (shih app/api/webhooks/egress-complete). Kontrollon nëse
// email-i (ose domain-i i tij) përputhet me një SponsorAccount aktiv,
// të vendosur MANUALISHT nga admini te dashboard — asnjëherë të hamendësuar.
export async function decidePlanForParticipant(email: string): Promise<PlanDecision> {
  const domain = email.split('@')[1]?.toLowerCase()

  const sponsor = await prisma.sponsorAccount.findFirst({
    where: {
      active: true,
      hasLeadsIncluded: true,
      OR: [
        { contactEmail: email.toLowerCase() },
        ...(domain ? [{ emailDomain: domain }] : []),
      ],
    },
  })

  if (sponsor) {
    return { plan: 'sponsor_included', trialEndsAt: null }
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)
  return { plan: 'trial', trialEndsAt }
}

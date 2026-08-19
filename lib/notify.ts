import { prisma } from './prisma'

type NotifType = 'trial_started' | 'trial_ending_soon' | 'no_feedback_streak' | 'converted' | 'error'
type Severity = 'info' | 'warning' | 'critical'

export async function notifyAdmin(
  participantId: string,
  type: NotifType,
  severity: Severity,
  message: string
) {
  await prisma.adminNotification.create({
    data: { participantId, type, severity, message },
  })
  // Supabase Realtime e "shtyn" këtë automatikisht te dashboard-i i hapur,
  // sepse tabela AdminNotification ka replikim të aktivizuar (shih README).
}

// Rregull i thjeshtë, i qartë (jo "AI misterioze" siç u kërkua):
// nëse 3 leads rresht s'kanë marrë feedback, ngrihet flamur.
export async function checkNoFeedbackStreak(participantId: string) {
  const recentLeads = await prisma.lead.findMany({
    where: { participantId },
    orderBy: { sentAt: 'desc' },
    take: 3,
    include: { feedback: true },
  })

  if (recentLeads.length === 3 && recentLeads.every((l) => !l.feedback)) {
    await notifyAdmin(
      participantId,
      'no_feedback_streak',
      'warning',
      '3 leads rresht pa feedback — mund të ketë humbur interesin, ja vlen ta kontaktosh personalisht.'
    )
  }
}

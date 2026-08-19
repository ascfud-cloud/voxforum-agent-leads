import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

// E DOMOSDOSHME: dashboard-i duhet të jetë gjithmonë i freskët (real-time),
// jo i para-gjeneruar gjatë build-it — përndryshe Next.js përpiqet të
// lidhet me databazën GJATË build-it (kur DB mund të mos jetë ende gati)
// dhe do të tregonte një "foto" të vjetër, jo të dhëna reale.
export const dynamic = 'force-dynamic'

// Faqja kryesore e adminit — shih diskutimin: "dua te jem i informuar per
// cdo gje ne kohe reale". Ky server component ngarkon gjendjen fillestare;
// DashboardClient pastaj mbahet i freskët automatikisht me Supabase Realtime.
export default async function DashboardPage() {
  const participants = await prisma.trialParticipant.findMany({
    include: {
      serviceProfile: true,
      leads: { include: { feedback: true }, orderBy: { sentAt: 'desc' } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
    orderBy: { trialStartedAt: 'desc' },
  })

  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return <DashboardClient initialParticipants={participants} initialNotifications={notifications} />
}

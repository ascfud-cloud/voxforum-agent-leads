import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const participants = await prisma.trialParticipant.findMany({
    include: {
      serviceProfile: true,
      leads: { include: { feedback: true }, orderBy: { sentAt: 'desc' } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
    orderBy: { trialStartedAt: 'desc' },
  })
  return NextResponse.json(participants)
}

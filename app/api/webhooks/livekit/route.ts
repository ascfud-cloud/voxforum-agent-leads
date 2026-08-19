import { NextRequest, NextResponse } from 'next/server'
import { verifyLiveKitWebhook, startSpeakerEgress } from '@/lib/livekit'

// Kjo është pika ku Agjenti "dëgjon" LiveKit-in NGA JASHTË — VoxForum
// s'e di fare që kjo po ndodh. Konfigurohet te dashboard-i i LiveKit:
// Settings -> Webhooks -> URL e këtij endpoint-i.
export async function POST(req: NextRequest) {
  const body = await req.text()
  const authHeader = req.headers.get('Authorization')

  const event = verifyLiveKitWebhook(body, authHeader)
  if (!event) {
    return NextResponse.json({ error: 'invalid webhook signature' }, { status: 401 })
  }

  // Na intereson vetëm momenti kur dikush fillon të publikojë ZË
  // (d.m.th. u bë "speaker" në VoxForum — host-i e aprovoi raise hand-in).
  if (event.event === 'track_published' && event.track?.type === 'AUDIO') {
    const roomName = event.room?.name
    const participantIdentity = event.participant?.identity

    if (roomName && participantIdentity) {
      await startSpeakerEgress(roomName, participantIdentity)
    }
  }

  return NextResponse.json({ ok: true })
}

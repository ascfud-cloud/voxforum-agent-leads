import { NextRequest, NextResponse } from 'next/server'
import { verifyLiveKitWebhook } from '@/lib/livekit'
import { transcribeSpeakerAudio, extractServiceProfile } from '@/lib/groq'
import { fetchParticipantEmail } from '@/lib/voxforum-client'
import { decidePlanForParticipant } from '@/lib/plan'
import { notifyAdmin } from '@/lib/notify'
import { prisma } from '@/lib/prisma'
import { sendWelcomeSetLocationEmail } from '@/lib/resend'

// LiveKit e ndalon vetë Participant Egress kur personi largohet nga dhoma,
// dhe pas kësaj dërgon këtë webhook me linkun e skedarit audio TË PASTËR
// (vetëm zëri i atij personi — jo audio i përzier i gjithë dhomës).
export async function POST(req: NextRequest) {
  const body = await req.text()
  const authHeader = req.headers.get('Authorization')

  const event = verifyLiveKitWebhook(body, authHeader)
  if (!event || event.event !== 'egress_ended') {
    return NextResponse.json({ ok: true }) // injorojmë çdo tjetër lloj eventi
  }

  const participantIdentity = event.egressInfo?.participantEgress?.participantIdentity
  const fileUrl = event.egressInfo?.fileResults?.[0]?.location

  if (!participantIdentity || !fileUrl) {
    return NextResponse.json({ ok: true })
  }

  // 1) Merr email-in — VoxForum PËRGJIGJET (nuk njofton vetë), siç u vendos.
  const voxforumData = await fetchParticipantEmail(participantIdentity)
  if (!voxforumData) {
    console.error(`S'u gjet email për participantId=${participantIdentity}`)
    return NextResponse.json({ ok: true })
  }

  // 2) Transkripton skedarin e pastër (vetëm ky person).
  const transcript = await transcribeSpeakerAudio(fileUrl)
  if (transcript.length < 50) {
    // Foli shumë pak — s'ka mjaftueshëm kontekst për një profil të sigurt.
    // Nuk hamendësojmë, thjesht s'e fusim në trial.
    return NextResponse.json({ ok: true, skipped: 'transcript too short' })
  }

  // 3) Nxjerr profilin e shërbimit + industritë relevante.
  const profile = await extractServiceProfile(transcript)
  if (profile.targetIndustries.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no confident industries extracted' })
  }

  // 4) Vendos planin — trial normal apo sponsor_included (shih lib/plan.ts,
  // pyetja jote për sponsorët).
  const planDecision = await decidePlanForParticipant(voxforumData.email)

  const participant = await prisma.trialParticipant.upsert({
    where: { participantId: participantIdentity },
    create: {
      participantId: participantIdentity,
      discussionSlug: voxforumData.discussionSlug,
      email: voxforumData.email,
      name: voxforumData.name,
      status: 'active',
      trialEndsAt: planDecision.trialEndsAt ?? new Date('2099-01-01'),
      serviceProfile: {
        create: {
          rawTranscript: transcript,
          serviceSummary: profile.serviceSummary,
          targetIndustries: profile.targetIndustries,
          location: '', // kërkohet ende nga pjesëmarrësi — shih shënim poshtë
        },
      },
    },
    update: {}, // nëse ekziston tashmë, s'e rikrijojmë
  })

  await prisma.subscription.upsert({
    where: { participantId: participantIdentity },
    create: { participantId: participantIdentity, plan: planDecision.plan, status: planDecision.plan },
    update: {},
  })

  await notifyAdmin(
    participantIdentity,
    'trial_started',
    'info',
    `${voxforumData.name} filloi ${planDecision.plan === 'sponsor_included' ? 'shërbimin (sponsor)' : 'trial-in 30-ditor'}.`
  )

  // Profili ende s'ka "location" — pjesëmarrësi e vendos vetë (zona s'nxirret
  // nga transkripti, siç u vendos). I dërgohet një link drejt /setup-location.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  await sendWelcomeSetLocationEmail(
    voxforumData.email,
    voxforumData.name,
    `${appUrl}/setup-location?participant=${participantIdentity}`
  )

  return NextResponse.json({ ok: true, participant: participant.id })
}

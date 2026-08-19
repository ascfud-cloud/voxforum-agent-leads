import { EgressClient, WebhookReceiver, EncodedFileOutput } from 'livekit-server-sdk'

// I RËNDËSISHËM: këto janë çelësat e RINJ, të krijuar posaçërisht për
// Agjentin (jo çelësat kryesorë të VoxForum). Shiko README.md -> "LiveKit".
const LIVEKIT_URL = process.env.LIVEKIT_API_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

// Verifikon që webhook-u erdhi vërtet nga LiveKit (jo dikush tjetër që
// thërret endpoint-in tonë duke u shtirë si LiveKit).
export function verifyLiveKitWebhook(body: string, authHeader: string | null) {
  if (!authHeader) return null
  try {
    return webhookReceiver.receive(body, authHeader)
  } catch {
    return null
  }
}

// Fillon regjistrimin VETËM të zërit të një pjesëmarrësi specifik
// (Participant Egress). LiveKit vetë e ndalon kur ai person largohet.
// Rezultati (fileUrl) do të vijë më vonë përmes një webhook tjetër
// ("egress_ended"), trajtuar te app/api/webhooks/egress-complete.
export async function startSpeakerEgress(roomName: string, participantIdentity: string) {
  const fileOutput = new EncodedFileOutput({
    filepath: `recordings/${roomName}/${participantIdentity}-{time}.mp4`,
    // Storage-i (S3/Supabase Storage/GCP) konfigurohet te Egress project
    // settings në dashboard-in e LiveKit, jo këtu në kod.
  })

  return egressClient.startParticipantEgress(roomName, participantIdentity, {
    fileOutputs: [fileOutput],
  })
}

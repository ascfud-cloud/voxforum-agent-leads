import { EgressClient, WebhookReceiver, EncodedFileOutput } from 'livekit-server-sdk'

// I RËNDËSISHËM: këto janë çelësat e RINJ, të krijuar posaçërisht për
// Agjentin (jo çelësat kryesorë të VoxForum). Shiko README.md -> "LiveKit".
const LIVEKIT_URL = process.env.LIVEKIT_API_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

// Verifikon që webhook-u erdhi vërtet nga LiveKit (jo dikush tjetër që
// thërret endpoint-in tonë duke u shtirë si LiveKit). receive() e SDK-së
// kthen Promise, prandaj funksioni këtu është async.
export async function verifyLiveKitWebhook(body: string, authHeader: string | null) {
  if (!authHeader) return null
  try {
    return await webhookReceiver.receive(body, authHeader)
  } catch {
    return null
  }
}

// Fillon regjistrimin VETËM të zërit të një pjesëmarrësi specifik
// (Participant Egress). LiveKit vetë e ndalon kur ai person largohet.
// Rezultati (fileUrl) do të vijë më vonë përmes një webhook tjetër
// ("egress_ended"), trajtuar te app/api/webhooks/egress-complete.
//
// Storage-i (Supabase Storage, S3-compatible) specifikohet KËTU, në kod,
// sepse LiveKit Cloud s'ofron konfigurim storage-i te dashboard — faqja
// "Egresses" atje është vetëm monitorim/histori, jo konfigurim.
export async function startSpeakerEgress(roomName: string, participantIdentity: string) {
  const fileOutput = new EncodedFileOutput({
    filepath: `recordings/${roomName}/${participantIdentity}-{time}.mp4`,
    output: {
      case: 's3',
      value: {
        accessKey: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
        secret: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || '',
        endpoint: process.env.SUPABASE_S3_ENDPOINT || '',
        region: process.env.SUPABASE_S3_REGION || '',
        bucket: process.env.SUPABASE_S3_BUCKET || 'speaker-recordings',
        forcePathStyle: true, // kërkohet nga shumica e shërbimeve S3-compatible (jo AWS vetë)
      },
    },
  })

  return egressClient.startParticipantEgress(roomName, participantIdentity, {
    file: fileOutput,
  })
}

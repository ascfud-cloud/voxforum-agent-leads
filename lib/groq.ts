import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Hapi 1: transkripton skedarin audio TË PASTËR (vetëm një folës,
// ardhur nga LiveKit Participant Egress — jo audio i përzier).
export async function transcribeSpeakerAudio(audioUrl: string): Promise<string> {
  const audioRes = await fetch(audioUrl)
  const audioBuffer = await audioRes.arrayBuffer()

  const transcription = await groq.audio.transcriptions.create({
    file: new File([audioBuffer], 'speaker.mp4'),
    model: 'whisper-large-v3',
    response_format: 'text',
  })

  return (transcription as unknown as string).trim()
}

interface ServiceProfileResult {
  serviceSummary: string
  targetIndustries: string[]
}

// Hapi 2: nxjerr profilin e shërbimit + harton industritë RELEVANTE
// (jo konkurrentë, por klientë/bashkëpunëtorë logjikë — shih shembullin
// e kontabilitetit që diskutuam: gjen firma software/restorante, jo firma
// të tjera kontabiliteti).
export async function extractServiceProfile(transcript: string): Promise<ServiceProfileResult> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je një analist biznesi. Të jepet transkripti i fjalës së VETËM NJË personi
nga një diskutim. Detyra jote:
1. Përmblidh në 1-2 fjali çfarë shërbimi/produkti ofron ky person.
2. Nxirr një listë prej 3-6 KATEGORISH BIZNESI që do të kishin nevojë REALE për këtë
   shërbim si klientë/bashkëpunëtorë (JO konkurrentë të drejtpërdrejtë të tij).
   Shembull: dikush ofron kontabilitet -> ["software firms","restaurants","clinics",
   "retail stores","construction companies"], JO ["accounting firms"].
Përgjigju VETËM me JSON: {"serviceSummary": "...", "targetIndustries": ["...", "..."]}
Nëse transkripti është shumë i shkurtër ose i paqartë për të nxjerrë diçka të sigurt,
kthe targetIndustries si listë bosh — mos hamendëso.`,
      },
      { role: 'user', content: transcript.slice(0, 8000) },
    ],
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw)
  return {
    serviceSummary: parsed.serviceSummary || '',
    targetIndustries: Array.isArray(parsed.targetIndustries) ? parsed.targetIndustries : [],
  }
}

// Përdoret te nxjerrja e kontaktit nga faqja e kompanisë: kërkon te teksti
// i faqes "Contact/About" për email/telefon, me prioritet manager/admin.
export async function extractContactFromPageText(pageText: string): Promise<{
  emails: { address: string; role: 'manager' | 'admin' | 'generic' }[]
  phones: string[]
  contactPersonName: string | null
}> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Nxirr kontaktet nga teksti i një faqe interneti kompanie. Për çdo email
të gjetur, klasifikoje si "manager" (nëse duket si emër personi ose rol drejtues:
manager@, director@, hr@), "admin" (admin@, ceo@), ose "generic" (info@, office@,
contact@, support@). Nëse gjen emër personi pranë një emaili, jepe te contactPersonName.
Përgjigju VETËM me JSON: {"emails":[{"address":"...","role":"..."}],"phones":["..."],
"contactPersonName": null}. Nëse s'gjen asgjë, kthe listat bosh.`,
      },
      { role: 'user', content: pageText.slice(0, 6000) },
    ],
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  return JSON.parse(raw)
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import { Resend } from 'resend'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

// SHËNIM I RËNDËSISHËM (ligjor, jo thjesht teknik): kjo dërgon email drejt
// palës së tretë (kompanisë-lead), jo te vetë pjesëmarrësi. Prandaj aktivizohet
// VETËM me kërkesë eksplicite të pjesëmarrësit (asnjëherë automatikisht), siç
// u diskutua te rreziku GDPR/ePrivacy i cold email-eve. Mban regjistër (opt-in
// eksplicit) të kësaj kërkese te Lead.agentContactRequested.
export async function POST(req: NextRequest) {
  const { participantId, company } = await req.json()

  const lead = await prisma.lead.findFirst({
    where: { participantId, website: company },
    orderBy: { sentAt: 'desc' },
    include: { participant: { include: { serviceProfile: true } } },
  })
  if (!lead || !lead.contactEmail) {
    return NextResponse.json({ error: 'lead or contact email not found' }, { status: 404 })
  }

  const draft = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: `Shkruaj një email të shkurtër, profesional, jo-agresiv prezantimi biznesi
në shqip, nga emri i dërguesit të dhënë, drejt kompanisë marrëse. Bazohu VETËM te
përshkrimi i shërbimit të dhënë. Mos shpik fakte. Mbaje nën 120 fjalë.`,
      },
      {
        role: 'user',
        content: `Dërguesi: ${lead.participant.name}\nShërbimi i tij: ${lead.participant.serviceProfile?.serviceSummary}\nKompania marrëse: ${lead.companyName}`,
      },
    ],
  })

  const emailBody = draft.choices[0]?.message?.content || ''

  await resend.emails.send({
    from: process.env.AGENT_EMAIL_FROM || 'leads@voxforum-agent.example.com',
    to: lead.contactEmail,
    replyTo: lead.participant.email, // përgjigjet shkojnë direkt te pjesëmarrësi
    subject: `Prezantim: ${lead.participant.name}`,
    html: emailBody.replace(/\n/g, '<br/>'),
  })

  await prisma.lead.update({
    where: { id: lead.id },
    data: { agentContactRequested: true, agentContactSentAt: new Date(), status: 'contacted' },
  })

  return NextResponse.json({ ok: true })
}

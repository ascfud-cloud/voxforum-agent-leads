import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.AGENT_EMAIL_FROM || 'leads@voxforum-agent.example.com'

interface LeadEmailData {
  companyName: string
  website: string
  contactEmail?: string | null
  contactPhone?: string | null
  contactPersonName?: string | null
  reasonMatched: string
  feedbackUrl: string
  agentContactUrl: string
}

export async function sendDailyLeadsEmail(to: string, name: string, leads: LeadEmailData[]) {
  const leadsHtml = leads
    .map(
      (l) => `
    <div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin-bottom:12px;">
      <strong>${l.companyName}</strong><br/>
      <a href="https://${l.website}">${l.website}</a><br/>
      ${l.contactPersonName ? `Kontakt: ${l.contactPersonName}<br/>` : ''}
      ${l.contactEmail ? `Email: ${l.contactEmail}<br/>` : ''}
      ${l.contactPhone ? `Tel: ${l.contactPhone}<br/>` : ''}
      <p style="color:#666;font-size:14px;">${l.reasonMatched}</p>
      <a href="${l.feedbackUrl}" style="margin-right:12px;">Jep feedback</a>
      <a href="${l.agentContactUrl}">Kontaktoje ti për mua</a>
    </div>`
    )
    .join('')

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${leads.length} kontakt${leads.length > 1 ? 'e' : ''} të ri/reja për ty`,
    html: `<p>Përshëndetje ${name},</p><p>Ja kompanitë e gjetura sot:</p>${leadsHtml}`,
  })
}

// Dërgohet menjëherë pas nxjerrjes së profilit — kërkon nga vetë
// pjesëmarrësi të vendosë lokacionin (s'e nxjerrim nga transkripti,
// siç u vendos: gjeolokacioni e zgjedh personi, jo hamendësim).
export async function sendSetupLocationEmail(to: string, name: string, participantId: string, serviceSummary: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Aktivizo kontaktet automatike (1 hap i fundit)',
    html: `<p>Përshëndetje ${name},</p>
      <p>Nga diskutimi kuptuam: <em>${serviceSummary}</em>.</p>
      <p>Na duhet vetëm zona ku duhen gjetur kompanitë, dhe fillojmë:</p>
      <p><a href="${appUrl}/setup-location?participant=${participantId}">Vendos zonën time</a></p>`,
  })
}

export async function sendWelcomeSetLocationEmail(to: string, name: string, setupUrl: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Mirë se erdhe — vendos zonën për kontaktet e tua',
    html: `<p>Përshëndetje ${name},</p>
      <p>Kuptuam çfarë ofron nga diskutimi. Na duhet vetëm zona ku duhet të kërkojmë kompani për ty.</p>
      <p><a href="${setupUrl}" style="background:#111;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;">Vendos zonën time</a></p>
      <p style="color:#888;font-size:13px;">Pa këtë hap, s'mund të fillojmë kërkimin.</p>`,
  })
}

export async function sendNoResultsEmail(to: string, name: string, message: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Nuk u gjetën kontakte të reja sot',
    html: `<p>Përshëndetje ${name},</p><p>${message}</p>`,
  })
}

export async function sendTrialEndingSoonEmail(
  to: string,
  name: string,
  stats: { totalLeads: number; converted: number }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Trial-i yt i leads mbaron së shpejti',
    html: `<p>Përshëndetje ${name},</p>
      <p>Trial-i yt 30-ditor po mbaron. Deri tani ke marrë <strong>${stats.totalLeads}</strong> kontakte,
      nga të cilat <strong>${stats.converted}</strong> u konvertuan.</p>
      <p>Nëse dëshiron të vazhdosh të marrësh kontakte, abonimi kushton <strong>90€/muaj</strong>.</p>`,
  })
}

export async function sendTrialExpiredOfferEmail(
  to: string,
  name: string,
  stats: { totalLeads: number; converted: number }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Trial-i yt mbaroi — vazhdo me abonim',
    html: `<p>Përshëndetje ${name},</p>
      <p>Për periudhën e trial-it, sistemi ynë gjeti <strong>${stats.totalLeads}</strong> kontakte për ty,
      nga të cilat <strong>${stats.converted}</strong> u konvertuan.</p>
      <p>Nëse dëshiron të vazhdosh të marrësh kontakte, abonimi kushton <strong>90€/muaj</strong>.</p>`,
  })
}

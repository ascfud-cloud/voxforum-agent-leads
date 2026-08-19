# Voxforum Leads Agent

Projekt krejt i veçantë nga VoxForum. E vetmja lidhje: (1) LiveKit — dëgjon
"nga jashtë" për të regjistruar zërin e çdo speaker-i veç e veç; (2) një
endpoint i ri, opsional, te VoxForum (shih `INTEGRATION_VOXFORUM.md`) që
përgjigjet me email-in kur pyetet.

## Struktura

```
prisma/schema.prisma       databaza e VET, në Supabase, e ndarë nga VoxForum
lib/
  livekit.ts                verifikim webhook + fillim Participant Egress
  groq.ts                   transkriptim + nxjerrje profili + hartë industrish
  serpapi.ts                kërkim kompanish (Google Local, jo social media)
  contact-scraper.ts        vizitë e vetme, e matur, respekton robots.txt
  resend.ts                 të gjitha email-et (mirëseardhje, leads, trial)
  plan.ts                   trial vs sponsor_included (shih më poshtë)
  notify.ts                 flamujt për dashboard-in real-time
  voxforum-client.ts        pyet VoxForum "email për këtë userId?"
app/
  api/webhooks/livekit           dëgjon "dikush filloi të flasë"
  api/webhooks/egress-complete   dëgjon "regjistrimi mbaroi" -> fillon gjithçka
  api/cron/daily-leads           1x/ditë: kërkon, gjen kontakte, dërgon 1-3 leads
  api/leads/feedback             klikimi nga email -> ruan statusin
  api/leads/agent-contact        "kontaktoje ti" -> email personalizuar te lead-i
  api/admin/sponsors             SHTIM MANUAL i sponsorëve (shih poshtë)
  dashboard/                     pamja jote, real-time (Supabase Realtime)
  setup-location/                pjesëmarrësi vendos zonën e kërkimit
```

## Si vendoset kush është "sponsor_included" (pyetja jote)

Kurrë automatikisht. Te `/dashboard`, shtohet një sponsor duke thirrur
`POST /api/admin/sponsors` (me header `x-admin-secret`) pasi të nënshkruhet
kontrata 2500€. Nga ai moment, çdo pjesëmarrës me atë email/domain hyn me
`plan = sponsor_included`, pa afat 30-ditësh, pa ofertën 90€.

## Hapat për ta ngritur (në renditje)

1. **Supabase**: krijo projekt të ri → kopjo `DATABASE_URL` + `NEXT_PUBLIC_SUPABASE_URL` + anon key te `.env`
2. `npm install`
3. `npm run db:push` — krijon tabelat te Supabase nga `schema.prisma`
4. Te Supabase → Database → Replication: aktivizo replikim për tabelat `Lead`, `Feedback`, `AdminNotification` (kërkohet që dashboard-i të jetë vërtet real-time)
5. **LiveKit**: çelësi i ri që krijove tashmë → `.env`. Te dashboard-i i LiveKit → Settings → Webhooks: shto URL-në e vet aplikacionit (`https://.../api/webhooks/livekit` dhe `.../api/webhooks/egress-complete`)
6. **SerpApi / Groq / Resend**: krijo llogari, kopjo çelësat te `.env`
7. **VoxForum**: kur të jesh gati, shto skedarin nga `INTEGRATION_VOXFORUM.md` (opsionale për të filluar zhvillimin lokal me të dhëna test)
8. `npm run dev` → provo `/dashboard`
9. Vendos në Vercel + GitHub siç u vendos; `vercel.json` e ka cron-in gati (çdo ditë ora 8:00 UTC — ndrysho nëse do orë tjetër)

## Çfarë ende mbetet për t'u testuar/rregulluar para prodhimit

- LiveKit Egress kërkon storage (S3/GCS) të konfiguruar te vetë projekti LiveKit — ende s'është vendosur ku ruhen skedarët audio
- Testim i vërtetë i `INTEGRATION_VOXFORUM.md` te një kopje/branch e VoxForum, siç e kërkove — jo direkt në prodhim
- Limitet e SerpApi/Resend duhen monitoruar kur numri i pjesëmarrësve aktivë rritet (shih llogaritjen e kostove që bëmë më parë: ~3-6€/pjesëmarrës/30 ditë)

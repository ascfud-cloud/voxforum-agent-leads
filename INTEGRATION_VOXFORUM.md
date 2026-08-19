# Integrimi me VoxForum — ÇFARË DHE KU (vetëm kaq, asgjë tjetër)

Ky skedar përshkruan **të vetmen** gjë që lidhet me VoxForum. Asgjë nga kjo
s'është aplikuar automatikisht — ti (ose kushdo që punon te VoxForum) e shton
KUR TË DUASH, duke kopjuar skedarin më poshtë si **skedar krejt të ri**.

## Rregulli themelor

- **NUK ndryshohet ASNJË skedar ekzistues i VoxForum.**
- **NUK ndryshohet `prisma/schema.prisma` i VoxForum.**
- Shtohet **VETËM 1 skedar i ri**, që sot s'ekziston.
- VoxForum mbetet plotësisht PASIV: s'nis asgjë vetë, thjesht përgjigjet kur
  pyetet — dhe vetëm nëse pyetja vjen me sekretin e saktë.

## Skedari i ri për t'u shtuar te VoxForum

**Rruga**: `app/api/agent/participant-email/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Endpoint i RI, i izoluar — përgjigjet VETËM kur Agjenti Leads pyet,
// me sekretin e saktë. S'prek asnjë rrugë tjetër të VoxForum.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const agentSecret = req.nextUrl.searchParams.get('agentSecret')

  if (agentSecret !== process.env.AGENT_SHARED_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!userId) {
    return NextResponse.json({ error: 'missing userId' }, { status: 400 })
  }

  const participant = await prisma.participant.findFirst({
    where: { userId },
    include: { user: true, discussion: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!participant) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({
    email: participant.user.email,
    name: `${participant.user.firstName} ${participant.user.lastName}`,
    discussionSlug: participant.discussion.slug,
  })
}
```

## Ndryshorja e vetme për t'u shtuar te `.env` i VoxForum

```
AGENT_SHARED_SECRET="e-njejta-vlere-si-te-AGENT_SHARED_SECRET-te-agjenti"
```

(Ti the që do e bësh vetë, më kompleks — mirë, thjesht sigurohu që **të
njëjtën vlerë saktësisht** ta vendosësh edhe te `.env` i Agjentit.)

## Pse kjo mbetet "zero prekje" në praktikë

- Skedari është **i ri** — s'ka asnjë rresht të ekzistuesin që preket.
- Nëse s'e shton fare, VoxForum vazhdon të punojë saktësisht si sot —
  thjesht Agjenti s'do të marrë dot email-e (dhe do ta shohësh këtë
  qartë te logu, jo si dështim i heshtur).
- Skedari lexon (SELECT), s'shkruan (s'ka `create`/`update`/`delete`) —
  pra s'ka mundësi të prishë të dhëna ekzistuese, sido që të përdoret.

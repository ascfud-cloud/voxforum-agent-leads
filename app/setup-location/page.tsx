import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

async function saveLocation(formData: FormData) {
  'use server'
  const participantId = formData.get('participantId') as string
  const location = formData.get('location') as string
  const radius = Number(formData.get('radius')) || 15

  await prisma.serviceProfile.update({
    where: { participantId },
    data: { location, locationRadiusKm: radius },
  })

  redirect('/setup-location/done')
}

export default async function SetupLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ participant?: string }>
}) {
  const { participant: participantId } = await searchParams
  if (!participantId) return <p style={{ padding: 40 }}>Link i pavlefshëm.</p>

  const profile = await prisma.serviceProfile.findUnique({ where: { participantId } })
  if (!profile) return <p style={{ padding: 40 }}>Profili s'u gjet — provo më vonë.</p>

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ku duhet të kërkojmë?</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Ne kuptuam: <em>{profile.serviceSummary}</em>. Na duhet vetëm qyteti/zona ku duhen gjetur kompanitë.
      </p>
      <form action={saveLocation} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="participantId" value={participantId} />
        <input name="location" placeholder="p.sh. Tiranë" required style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
        <input name="radius" type="number" defaultValue={15} placeholder="Rreze (km)" style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
        <button type="submit" style={{ padding: 12, borderRadius: 8, background: '#111', color: 'white', border: 'none', cursor: 'pointer' }}>
          Fillo kërkimin
        </button>
      </form>
    </div>
  )
}

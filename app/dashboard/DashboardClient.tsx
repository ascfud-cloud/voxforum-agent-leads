'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface Props {
  initialParticipants: any[]
  initialNotifications: any[]
}

export default function DashboardClient({ initialParticipants, initialNotifications }: Props) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [selected, setSelected] = useState<string | null>(null)

  // Supabase Realtime: sapo tabelat ndryshojnë (leads i ri, feedback,
  // njoftim i ri), faqja rifreskohet vetë, pa reload — pikërisht "kohë
  // reale" siç u kërkua, pa ndërtuar infrastrukturë WebSocket nga zero.
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('admin-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'AdminNotification' },
        (payload) => setNotifications((prev) => [payload.new, ...prev].slice(0, 30))
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Lead' },
        () => refreshParticipants()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Feedback' },
        () => refreshParticipants()
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [])

  async function refreshParticipants() {
    const res = await fetch('/api/dashboard/participants')
    if (res.ok) setParticipants(await res.json())
  }

  const activeCount = participants.filter((p) => p.status === 'active').length
  const criticalNotifs = notifications.filter((n) => n.severity !== 'info' && !n.read)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Voxforum Leads Agent</h1>
      <p style={{ color: '#666', marginBottom: 28 }}>{activeCount} pjesëmarrës aktivë · përditësohet automatikisht</p>

      {criticalNotifs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: '#b45309' }}>Kërkon vëmendjen tënde</h2>
          {criticalNotifs.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 6,
                background: n.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${n.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                fontSize: 14,
              }}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Pjesëmarrësit</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {participants.map((p) => {
          const totalLeads = p.leads?.length ?? 0
          const converted = p.leads?.filter((l: any) => l.feedback?.outcome === 'converted').length ?? 0
          const daysLeft = Math.ceil((new Date(p.trialEndsAt).getTime() - Date.now()) / 86_400_000)

          return (
            <div key={p.id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setSelected(selected === p.id ? null : p.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', background: 'white',
                  border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span>
                  <strong>{p.name}</strong>
                  <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{p.serviceProfile?.serviceSummary || 'profili s\'është ende gati'}</span>
                </span>
                <span style={{ fontSize: 13, color: '#555' }}>
                  {totalLeads} leads · {converted} konvertuar · {p.status === 'active' ? `${daysLeft}d mbetur` : p.status}
                </span>
              </button>

              {selected === p.id && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eee' }}>
                  {(p.leads ?? []).map((l: any) => (
                    <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid #f2f2f2', fontSize: 13 }}>
                      <strong>{l.companyName}</strong> — {l.website} — status: {l.status}
                      {l.feedback && <span> — feedback: {l.feedback.outcome}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

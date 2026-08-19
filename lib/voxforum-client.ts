// Thërret endpoint-in E VOGËL, TË RI te VoxForum (Rruga "pyetje" që u
// miratua) — një skedar që s'ekziston sot te VoxForum dhe NUK prek asnjë
// kod ekzistues. Shiko INTEGRATION_VOXFORUM.md për skedarin e saktë që
// duhet shtuar atje (ti e shton vetë, ne s'e prekim VoxForum nga këtu).
const VOXFORUM_BASE_URL = process.env.VOXFORUM_BASE_URL || ''
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || ''

export async function fetchParticipantEmail(
  userId: string
): Promise<{ email: string; name: string; discussionSlug: string } | null> {
  const url = new URL('/api/agent/participant-email', VOXFORUM_BASE_URL)
  url.searchParams.set('userId', userId)
  url.searchParams.set('agentSecret', AGENT_SHARED_SECRET)

  const res = await fetch(url.toString())
  if (!res.ok) return null
  return res.json()
}

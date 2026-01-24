const PARTICIPANT_COLORS = [
  'bg-blue-500',
  'bg-rose-500',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-cyan-600',
  'bg-pink-500',
  'bg-orange-500',
  'bg-slate-600',
]

const CURSOR_COLORS = [
  'text-blue-500',
  'text-rose-500',
  'text-amber-600',
  'text-emerald-600',
  'text-indigo-500',
  'text-violet-500',
  'text-cyan-600',
  'text-pink-500',
  'text-orange-500',
  'text-slate-600',
]

export const getParticipantColor = (name: string) => {
  if (!name) return PARTICIPANT_COLORS[0]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % PARTICIPANT_COLORS.length
  }
  return PARTICIPANT_COLORS[hash]
}

export const getCursorColor = (name: string) => {
  if (!name) return CURSOR_COLORS[0]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % CURSOR_COLORS.length
  }
  return CURSOR_COLORS[hash]
}

export const getParticipantInitial = (name: string) => {
  const trimmed = name.trim()
  return trimmed ? trimmed[0] : '?'
}

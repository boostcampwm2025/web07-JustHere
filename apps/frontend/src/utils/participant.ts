const PARTICIPANT_COLORS = ['#fde68a', '#bfdbfe', '#fecaca', '#bbf7d0', '#e9d5ff', '#fed7aa', '#a7f3d0', '#c7d2fe', '#fbcfe8', '#bae6fd']

export const getParticipantColor = (name: string) => {
  if (!name) return PARTICIPANT_COLORS[0]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % PARTICIPANT_COLORS.length
  }
  return PARTICIPANT_COLORS[hash]
}

export const getParticipantInitial = (name: string) => {
  const trimmed = name.trim()
  return trimmed ? trimmed[0] : '?'
}

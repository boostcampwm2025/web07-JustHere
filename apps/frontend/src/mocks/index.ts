export const AVATARS = [
  'https://i.pravatar.cc/150?u=1',
  'https://i.pravatar.cc/150?u=2',
  'https://i.pravatar.cc/150?u=3',
  'https://i.pravatar.cc/150?u=3',
  'https://i.pravatar.cc/150?u=3',
]

export interface Participant {
  id: string
  name: string
  initial: string
  color: string
}

export const MOCK_PARTICIPANTS: Participant[] = [
  { id: '1', name: '지호준', initial: 'C', color: '#99F6C8' },
  { id: '2', name: '김아진', initial: 'S', color: '#FFABCD' },
  { id: '3', name: '이혜린', initial: 'A', color: '#F4F6A1' },
  { id: '4', name: '강!!민석', initial: 'S', color: '#FFCBA4' },
  { id: '5', name: '류건', initial: 'S', color: '#E1F5FE' },
]

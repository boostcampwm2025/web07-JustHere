import { create } from 'zustand';
import type { Participant, MeetingPlace } from '../types/meeting';

interface MeetingStore {
  participants: Participant[];
  selectedPlace: MeetingPlace | null;

  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, participant: Partial<Participant>) => void;
  setSelectedPlace: (place: MeetingPlace | null) => void;
  clearParticipants: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  participants: [],
  selectedPlace: null,

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),

  updateParticipant: (id, updates) =>
    set((state) => ({
      participants: state.participants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  setSelectedPlace: (place) => set({ selectedPlace: place }),

  clearParticipants: () => set({ participants: [] }),
}));

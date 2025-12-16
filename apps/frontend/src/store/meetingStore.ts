import { create } from 'zustand';
import type { Participant, MeetingPlace, PlaceCategory } from '../types/meeting';

interface MeetingStore {
  participants: Participant[];
  selectedPlace: MeetingPlace | null; // 최종 선택한 장소 (식당 등)
  selectedCategory: PlaceCategory | null;
  centerPlace: MeetingPlace | null; // 중간 지점 후보 (역, 지역 등)

  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, participant: Partial<Participant>) => void;
  setSelectedPlace: (place: MeetingPlace | null) => void;
  setSelectedCategory: (category: PlaceCategory | null) => void;
  setCenterPlace: (place: MeetingPlace | null) => void;
  clearParticipants: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  participants: [],
  selectedPlace: null,
  selectedCategory: null,
  centerPlace: null,

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

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setCenterPlace: (place) => set({ centerPlace: place }),

  clearParticipants: () => set({ participants: [] }),
}));

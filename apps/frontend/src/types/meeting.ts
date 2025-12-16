export type TransportMode = 'transit' | 'driving';

export type PlaceCategory = 'restaurant' | 'cafe' | 'bar' | 'park' | 'culture' | 'shopping';

export interface Participant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  transport: TransportMode;
}

export interface MeetingPlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string;
}

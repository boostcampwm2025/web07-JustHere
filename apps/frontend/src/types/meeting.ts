export type TransportMode = 'transit' | 'driving';

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
}

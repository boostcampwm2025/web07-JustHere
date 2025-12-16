export class Position {
  lat: number;
  lng: number;
}

export class RouteInfo {
  // 카카오 Directions API 응답의 경로 path (지도에 경로를 그릴 수 있는 요소)
  // ODsay API의 경우 경로 좌표 배열
  path: Position[]; // API 응답의 경로 path 원본
  duration: number; // 이동 시간 (초)
  distance: number; // 거리 (미터)
  transportMode: 'PUBLIC_TRANSPORT' | 'CAR';
}

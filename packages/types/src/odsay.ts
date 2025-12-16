export interface OdsayStation {
  index: number;
  stationName: string;
  x: string;
  y: string;
}

export interface OdsayLane {
  name?: string;
  subwayCode?: number;
  busNo?: string;
  type?: number;
}

export interface OdsaySubPath {
  trafficType: number; // 1: 지하철, 2: 버스, 3: 도보
  distance: number;
  sectionTime: number;
  lane?: OdsayLane[];
  passStopList?: {
    stations: OdsayStation[];
  };
  startName?: string;
  endName?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface OdsayPathInfo {
  totalTime: number;
  payment: number;
  totalDistance: number;
  firstStartStation: string;
  lastEndStation: string;
}

export interface OdsayTransitPath {
  pathType: number;
  info: OdsayPathInfo;
  subPath: OdsaySubPath[];
}

export interface OdsayTransitResponse {
  result: {
    path: OdsayTransitPath[];
  };
}

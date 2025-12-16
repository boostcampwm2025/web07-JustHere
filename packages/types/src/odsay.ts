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
  busID?: number; // 버스 노선 ID
  subwayCityCode?: number; // 지하철 도시 코드
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
  mapObj: string; // loadLane API용 mapObject 문자열
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

// LoadLane API 타입 정의
export interface OdsayGraphPos {
  x: number;
  y: number;
}

export interface OdsayLaneSection {
  graphPos: OdsayGraphPos[];
}

export interface OdsayLaneDetail {
  class: number; // 1: 버스, 2: 지하철
  type: number; // 노선 종류
  section: OdsayLaneSection[];
}

export interface OdsayLoadLaneResponse {
  result: {
    lane: OdsayLaneDetail[];
    boundary: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
  };
}

// 중간 위치 찾기 관련 타입
export interface UserLocationInput {
  name: string;
  x: number;
  y: number;
}

export interface StationCandidate {
  name: string;
  x: number;
  y: number;
  category: string; // "지하철역" or "버스정류장"
}

export interface UserToStationTime {
  userName: string;
  travelTime: number; // 분 단위
}

export interface MiddleLocationResult {
  station: StationCandidate;
  userTimes: UserToStationTime[];
  averageTime: number;
  maxTime: number;
  fairnessScore: number; // 표준편차의 역수 (높을수록 공평함)
}

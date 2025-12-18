// Naver Geocoding API 타입 정의

export interface NaverAddressElement {
  types: string[];
  longName: string;
  shortName: string;
  code: string;
}

export interface NaverAddress {
  roadAddress: string;
  jibunAddress: string;
  englishAddress: string;
  addressElements: NaverAddressElement[];
  x: string; // 경도
  y: string; // 위도
  distance: number;
}

export interface NaverGeocodingResponse {
  status: string;
  meta: {
    totalCount: number;
    page: number;
    count: number;
  };
  addresses: NaverAddress[];
  errorMessage: string;
}

// 사용자 위치 정보
export interface UserLocation {
  id: string;
  name: string;
  address: string;
  x: number; // 경도
  y: number; // 위도
  transportationType: "car" | "public_transit";
}

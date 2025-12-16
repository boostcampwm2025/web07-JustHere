/// <reference types="vite/client" />
declare namespace kakao.maps {
  // SDK 로드 함수 추가
  function load(callback: () => void): void;

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    getCenter(): LatLng;
    setBounds(bounds: LatLngBounds): void;
    addControl(control: ZoomControl, position: ControlPosition): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  class ZoomControl {}

  interface MapOptions {
    center: LatLng;
    level: number;
  }

  interface MarkerOptions {
    position: LatLng;
    map: Map;
  }

  interface InfoWindowOptions {
    content: string;
  }

  namespace event {
    function addListener(target: Marker, type: string, callback: () => void): void;
  }

  const ControlPosition: {
    TOP: number;
    TOPLEFT: number;
    TOPRIGHT: number;
    LEFT: number;
    RIGHT: number;
    BOTTOMLEFT: number;
    BOTTOM: number;
    BOTTOMRIGHT: number;
  };
}

interface Window {
  kakao: {
    maps: typeof kakao.maps;
  };
}

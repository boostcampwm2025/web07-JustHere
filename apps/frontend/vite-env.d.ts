/// <reference types="vite/client" />
declare namespace kakao.maps {
  // SDK 로드 함수 추가
  function load(callback: () => void): void;

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    panTo(latlng: LatLng): void;
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

  class Size {
    constructor(width: number, height: number);
  }

  class MarkerImage {
    constructor(src: string, size: Size);
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  class ZoomControl {}

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
  }

  namespace event {
    function addListener(target: any, type: string, handler: () => void): void;
  }

  interface MapOptions {
    center: LatLng;
    level: number;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    image?: MarkerImage;
    title?: string;
  }

  interface CustomOverlayOptions {
    content: string | HTMLElement;
    map?: Map;
    position: LatLng;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }

  interface PolylineOptions {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
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

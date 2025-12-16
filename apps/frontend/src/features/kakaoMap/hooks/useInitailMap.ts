import { useEffect, useRef, useState } from 'react';

export const useInitailMap = () => {
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const initializeMap = () => {
    const { kakao } = window;

    const mapOptions = {
      center: new kakao.maps.LatLng(37.3850142562829, 127.123430800216),
      level: 5,
    };

    const mapContainer = document.getElementById('kakao-map');
    if (!mapContainer) return;

    mapRef.current = new kakao.maps.Map(mapContainer, mapOptions);

    // 줌 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    mapRef.current.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    setIsMapLoaded(true);
  };

  useEffect(() => {
    // kakao SDK가 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
      // DOM이 준비될 때까지 대기
      const timer = setTimeout(() => {
        window.kakao.maps.load(() => {
          initializeMap();
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  return {
    isMapLoaded,
    mapRef,
  }
};

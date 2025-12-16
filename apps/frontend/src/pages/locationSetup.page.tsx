import { useEffect, useRef, useState } from 'react';
import type { KakaoLocalSearchItem, KakaoLocalSearchResponse } from '@web07/types';

function LocationSetupPage() {
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const infoWindowRef = useRef<kakao.maps.InfoWindow | null>(null);
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // kakao SDK가 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        initializeMap();
      });
    }
  }, []);

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

  const fetchData = async <T,>(
    url: string,
    params: Record<string, string | number>,
  ): Promise<T> => {
    const queryString = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    ).toString();
    const fullUrl = `${url}?${queryString}`;

    const response = await fetch(fullUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  const displayMarkers = (items: KakaoLocalSearchItem[]) => {
    const { kakao } = window;

    if (!mapRef.current) return;

    clearMarkers();

    if (items.length === 0) {
      alert('검색 결과가 없습니다.');
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    items.forEach((item) => {
      const position = new kakao.maps.LatLng(parseFloat(item.y), parseFloat(item.x));

      const marker = new kakao.maps.Marker({
        position,
        map: mapRef.current!,
      });

      const infoContent = `
        <div style="padding: 10px; min-width: 200px; max-width: 280px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">
            ${item.place_name}
          </h4>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${item.category_name}
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            ${item.road_address_name || item.address_name}
          </p>
          ${item.phone ? `<p style="margin: 4px 0; font-size: 12px;">📞 ${item.phone}</p>` : ''}
          ${item.distance ? `<p style="margin: 4px 0; font-size: 12px; color: #999;">📍 ${item.distance}m</p>` : ''}
          <a href="${item.place_url}" target="_blank" style="
            display: inline-block;
            margin-top: 8px;
            font-size: 12px;
            color: #3396ff;
            text-decoration: none;
          ">카카오맵에서 보기 →</a>
        </div>
      `;

      const infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        infoWindow.open(mapRef.current!, marker);
        infoWindowRef.current = infoWindow;
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    mapRef.current.setBounds(bounds);
  };

  const searchKakaoLocal = async () => {
    if (!keyword.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);

    try {
      const x = 127.123430800216;
      const y = 37.3850142562829;

      const data = await fetchData<KakaoLocalSearchResponse>(
        'http://localhost:3000/api/kakao/local-search',
        {
          query: keyword,
          x,
          y,
          radius: 5000,
        },
      );

      displayMarkers(data.documents);
    } catch (error) {
      console.error('카카오 검색 중 오류 발생:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') searchKakaoLocal();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-gray-200 bg-black p-5 h-32">
        <input
          type="text"
          placeholder="검색어를 입력하세요 (예: 맛집, 카페)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSearching || !isMapLoaded}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none"
        />
        <button
          onClick={searchKakaoLocal}
          disabled={isSearching || !isMapLoaded}
          className="rounded bg-[#fee500] px-4 py-2 font-medium text-[#3c1e1e] hover:bg-[#e6cf00] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSearching ? '검색 중...' : '검색'}
        </button>
      </div>
      <div  className="relative flex-1">
        <div style={{ height: '100vh' }} id="kakao-map" className="h-full w-full" />
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600">
            지도를 불러오는 중...
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationSetupPage;

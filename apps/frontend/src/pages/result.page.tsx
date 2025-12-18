import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useInitailMap } from '@/features/kakaoMap/hooks/useInitailMap';
import { usePlaceSearch } from '@/features/kakaoMap/hooks/usePlaceSearch';
import type { KakaoLocalSearchItem } from '@web07/types';

const CATEGORIES = [
  { code: 'CE7', name: '카페', icon: '☕' },
  { code: 'FD6', name: '맛집', icon: '🍽️' },
  { code: 'AT4', name: '활동', icon: '🎡' }, // 관광명소
  { code: 'CT1', name: '문화', icon: '🎬' }, // 문화시설
];

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { station } = location.state || {};

  const { isMapLoaded, mapRef } = useInitailMap();
  const { places, isLoading, error, searchKeyword, searchCategory, searchMixedCategories } =
    usePlaceSearch();

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<KakaoLocalSearchItem | null>(null);

  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const activeOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  // 초기 진입 시 역 위치로 지도 이동 및 마커 표시
  useEffect(() => {
    if (!station) {
      alert('선택된 중간 지점이 없습니다.');
      navigate('/middle');
      return;
    }

    if (isMapLoaded && mapRef.current) {
      const { kakao } = window;
      const moveLatLon = new kakao.maps.LatLng(station.y, station.x);
      mapRef.current.setCenter(moveLatLon);

      // 역 마커 표시
      const markerImage = new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
        new kakao.maps.Size(24, 35)
      );

      new kakao.maps.Marker({
        position: moveLatLon,
        map: mapRef.current,
        image: markerImage,
        title: station.name,
      });

      // 초기 진입 시 4개 카테고리에서 각 5개씩 총 20개 검색
      const categoryCodes = CATEGORIES.map((c) => c.code);
      searchMixedCategories(categoryCodes, {
        x: station.x,
        y: station.y,
        radius: 2000,
        sort: 'distance',
        size: 5, // 각 카테고리별 5개
      });
    }
  }, [station, isMapLoaded, navigate, searchMixedCategories]);

  // 마커 관리 (검색 결과 표시)
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const { kakao } = window;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 기존 오버레이 제거
    if (activeOverlayRef.current) {
      activeOverlayRef.current.setMap(null);
      activeOverlayRef.current = null;
    }

    if (places.length === 0) return;

    // 새 마커 생성
    const newMarkers = places.map((place) => {
      const position = new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
      const marker = new kakao.maps.Marker({
        position,
        map: mapRef.current!,
      });

      // 마커 클릭 이벤트
      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedPlace(place);

        // 오버레이 표시
        if (activeOverlayRef.current) {
          activeOverlayRef.current.setMap(null);
        }

        const content = `
          <div style="padding:10px;background:white;border:1px solid #ccc;border-radius:5px;font-size:12px;min-width:150px;">
            <div style="font-weight:bold;margin-bottom:5px;">${place.place_name}</div>
            <div style="color:gray;">${place.category_name}</div>
            <div style="margin-top:5px;color:blue;">
              <a href="${place.place_url}" target="_blank" rel="noreferrer">상세보기</a>
            </div>
          </div>
        `;

        const overlay = new kakao.maps.CustomOverlay({
          content,
          map: mapRef.current!,
          position: marker.getPosition(),
          yAnchor: 1.2,
          zIndex: 3,
        });

        activeOverlayRef.current = overlay;
      });

      return marker;
    });

    markersRef.current = newMarkers;

    // 모든 마커가 보이도록 지도 범위 재설정 (선택 사항)
    // const bounds = new kakao.maps.LatLngBounds();
    // places.forEach(place => bounds.extend(new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x))));
    // mapRef.current.setBounds(bounds);
  }, [places, isMapLoaded]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !station) return;

    setSelectedCategory(null);
    searchKeyword(keyword, {
      x: station.x,
      y: station.y,
      radius: 2000, // 2km 반경
      size: 10, // 10개 제한
    });
  };

  const handleCategoryClick = (code: string) => {
    if (!station) return;

    setKeyword('');

    // 이미 선택된 카테고리를 다시 클릭하면 선택 해제 및 초기 상태(통합 검색)로 복귀
    if (selectedCategory === code) {
      setSelectedCategory(null);
      const categoryCodes = CATEGORIES.map((c) => c.code);
      searchMixedCategories(categoryCodes, {
        x: station.x,
        y: station.y,
        radius: 2000,
        sort: 'distance',
        size: 5,
      });
      return;
    }

    // 새로운 카테고리 선택
    setSelectedCategory(code);
    searchCategory(code, {
      x: station.x,
      y: station.y,
      radius: 2000,
      sort: 'distance',
      size: 15, // 단일 카테고리는 15개
    });
  };

  if (!station) return null;

  return (
    <div className='relative w-full h-screen overflow-hidden bg-gray-50'>
      {/* 지도 영역 */}
      <div id='kakao-map' className='absolute inset-0 w-full h-full z-0' />

      {/* 상단 검색바 및 카테고리 */}
      <div className='absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-white/90 to-transparent pb-8'>
        <div className='flex items-center gap-2 mb-3'>
          <button
            onClick={() => navigate('/middle')}
            className='p-2 bg-white rounded-full shadow-md hover:bg-gray-100'
          >
            ←
          </button>
          <form onSubmit={handleSearch} className='flex-1'>
            <input
              type='text'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='장소 검색 (예: 스타벅스)'
              className='w-full px-4 py-2 rounded-full shadow-md border-none outline-none focus:ring-2 focus:ring-blue-500'
            />
          </form>
        </div>

        <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.code}
              onClick={() => handleCategoryClick(cat.code)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 하단 리스트 (바텀 시트 스타일) */}
      <div className='absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] max-h-[40vh] flex flex-col'>
        <div className='flex justify-center p-2'>
          <div className='w-10 h-1 bg-gray-300 rounded-full' />
        </div>

        <div className='px-4 pb-2 border-b'>
          <h2 className='font-bold text-gray-800'>
            {selectedCategory
              ? `${CATEGORIES.find((c) => c.code === selectedCategory)?.name} 추천`
              : keyword
              ? `'${keyword}' 검색 결과`
              : '주변 장소'}
            <span className='ml-2 text-sm text-gray-500 font-normal'>총 {places.length}개</span>
          </h2>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
          {isLoading ? (
            <div className='text-center py-8 text-gray-500'>검색 중...</div>
          ) : places.length > 0 ? (
            places.map((place) => (
              <div
                key={place.id}
                onClick={() => {
                  setSelectedPlace(place);
                  // 해당 마커로 지도 이동 및 오버레이 표시 로직 추가 가능
                  const { kakao } = window;
                  if (mapRef.current) {
                    const moveLatLon = new kakao.maps.LatLng(
                      parseFloat(place.y),
                      parseFloat(place.x)
                    );
                    mapRef.current.panTo(moveLatLon);
                  }
                }}
                className={`flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedPlace?.id === place.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-blue-200'
                }`}
              >
                {/* 이미지 표시 (이미지가 없으면 아이콘 표시) */}
                <div className='w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden'>
                  {place.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt={place.place_name}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span className='text-2xl'>
                      {CATEGORIES.find((c) => place.category_group_code === c.code)?.icon || '📍'}
                    </span>
                  )}
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex justify-between items-start'>
                    <h3 className='font-bold text-gray-800 truncate'>{place.place_name}</h3>
                    <span className='text-xs text-gray-500 whitespace-nowrap'>
                      {place.category_group_name}
                    </span>
                  </div>
                  <p className='text-sm text-gray-600 truncate'>
                    {place.road_address_name || place.address_name}
                  </p>
                  <div className='flex items-center gap-2 mt-1 text-xs'>
                    <span className='text-blue-600 font-medium'>{place.distance}m</span>
                    {place.phone && <span className='text-gray-400'>| {place.phone}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='text-center py-8 text-gray-500'>
              {error ? error : '검색 결과가 없습니다.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultPage;

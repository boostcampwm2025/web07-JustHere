import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetingStore } from '../../store/meetingStore';
import type { MeetingPlace, PlaceCategory } from '../../types/meeting';

const CATEGORY_MAP: Record<PlaceCategory, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  culture: 'tourist_attraction',
  shopping: 'shopping_mall',
  park: 'park',
};

export function ResultPage() {
  const navigate = useNavigate();
  const { participants, selectedCategory, setSelectedPlace } = useMeetingStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [places, setPlaces] = useState<MeetingPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // 참여자나 카테고리가 없으면 리다이렉트
  useEffect(() => {
    if (participants.length < 2) {
      alert('참여자가 충분하지 않습니다.');
      navigate('/');
      return;
    }
    if (!selectedCategory) {
      alert('장소 유형을 선택해주세요.');
      navigate('/places');
      return;
    }
  }, [participants, selectedCategory, navigate]);

  // 중간 지점 계산
  const getMidpoint = () => {
    if (participants.length === 0) return { lat: 37.5665, lng: 126.978 };

    const sumLat = participants.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = participants.reduce((sum, p) => sum + p.lng, 0);

    return {
      lat: sumLat / participants.length,
      lng: sumLng / participants.length,
    };
  };

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const center = getMidpoint();
    const mapInstance = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      mapTypeControl: false,
    });

    setMap(mapInstance);
    infoWindowRef.current = new google.maps.InfoWindow();

    // 참여자 마커 표시
    participants.forEach((p) => {
      new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapInstance,
        title: p.name,
        label: {
          text: p.name,
          color: 'white',
          className: 'bg-blue-600 px-2 py-1 rounded-lg text-xs font-bold shadow-md',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#2563EB',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    });

    // 중간 지점 마커
    new google.maps.Marker({
      position: center,
      map: mapInstance,
      title: '중간 지점',
      icon: {
        path: google.maps.SymbolPath.STAR,
        scale: 12,
        fillColor: '#DC2626',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 1000,
    });
  }, [participants]);

  // 장소 검색
  useEffect(() => {
    if (!map || !selectedCategory) return;

    const center = getMidpoint();
    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.PlaceSearchRequest = {
      location: center,
      radius: 2000, // 2km 반경
      type: CATEGORY_MAP[selectedCategory],
    };

    setLoading(true);
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const meetingPlaces: MeetingPlace[] = results.map((place) => ({
          placeId: place.place_id!,
          name: place.name!,
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
          address: place.vicinity || place.formatted_address || '',
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
        }));

        // 평점순 정렬
        meetingPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        setPlaces(meetingPlaces);

        // 기존 장소 마커 제거
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // 새 장소 마커 추가
        meetingPlaces.forEach((place) => {
          const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map,
            title: place.name,
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // 기본 핀
            },
          });

          marker.addListener('click', () => {
            infoWindowRef.current?.setContent(`
              <div class="p-2">
                <h3 class="font-bold">${place.name}</h3>
                <p class="text-sm text-gray-600">${place.address}</p>
                ${place.rating ? `<p class="text-sm text-yellow-600">⭐ ${place.rating}</p>` : ''}
              </div>
            `);
            infoWindowRef.current?.open(map, marker);
            setSelectedPlace(place);
          });

          markersRef.current.push(marker);
        });
      }
      setLoading(false);
    });
  }, [map, selectedCategory]);

  const handlePlaceClick = (place: MeetingPlace) => {
    setSelectedPlace(place);
    map?.panTo({ lat: place.lat, lng: place.lng });
    map?.setZoom(16);

    // 해당 마커의 인포윈도우 열기 (선택적)
    const marker = markersRef.current.find((m) => m.getTitle() === place.name);
    if (marker) {
      google.maps.event.trigger(marker, 'click');
    }
  };

  return (
    <div className='flex flex-col h-screen bg-gray-50 md:flex-row'>
      {/* 왼쪽: 장소 목록 */}
      <div className='w-full md:w-1/3 h-1/2 md:h-full overflow-y-auto border-r border-gray-200 bg-white shadow-lg z-10'>
        <div className='p-4 sticky top-0 bg-white border-b border-gray-100 z-10'>
          <div className='flex items-center justify-between mb-4'>
            <button
              onClick={() => navigate('/places')}
              className='text-sm text-gray-500 hover:text-gray-700 flex items-center'
            >
              ← 카테고리 다시 선택
            </button>
          </div>
          <h1 className='text-2xl font-bold text-gray-900'>추천 장소</h1>
          <p className='text-gray-600 text-sm mt-1'>
            중간 지점 반경 2km 내의 {places.length}개 장소
          </p>
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {places.map((place) => (
              <div
                key={place.placeId}
                onClick={() => handlePlaceClick(place)}
                className='p-4 hover:bg-blue-50 cursor-pointer transition-colors'
              >
                <div className='flex gap-4'>
                  {place.photoUrl && (
                    <img
                      src={place.photoUrl}
                      alt={place.name}
                      className='w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-200'
                    />
                  )}
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-gray-900 truncate'>{place.name}</h3>
                    <p className='text-sm text-gray-500 mt-1 truncate'>{place.address}</p>
                    <div className='flex items-center mt-2 text-sm'>
                      {place.rating && (
                        <span className='text-yellow-500 font-medium mr-2'>⭐ {place.rating}</span>
                      )}
                      {place.userRatingsTotal && (
                        <span className='text-gray-400'>({place.userRatingsTotal})</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {places.length === 0 && (
              <div className='p-8 text-center text-gray-500'>검색 결과가 없습니다.</div>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 지도 */}
      <div className='w-full md:w-2/3 h-1/2 md:h-full relative'>
        <div ref={mapRef} className='w-full h-full' />

        {/* 범례 */}
        <div className='absolute bottom-6 right-6 bg-white p-3 rounded-lg shadow-lg text-sm space-y-2'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-blue-600'></div>
            <span>참여자</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-red-600'></div>
            <span>중간 지점</span>
          </div>
        </div>
      </div>
    </div>
  );
}

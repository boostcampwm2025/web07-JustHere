import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetingStore } from '../../store/meetingStore';
import type { MeetingPlace, PlaceCategory } from '../../types/meeting';

const CATEGORIES: { id: PlaceCategory; label: string; icon: string }[] = [
  { id: 'restaurant', label: '식당', icon: '🍽️' },
  { id: 'cafe', label: '카페', icon: '☕' },
  { id: 'bar', label: '술집', icon: '🍺' },
  { id: 'culture', label: '문화', icon: '🎬' },
  { id: 'shopping', label: '쇼핑', icon: '🛍️' },
  { id: 'park', label: '공원', icon: '🌳' },
];

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
  const {
    participants,
    centerPlace,
    selectedPlace,
    setSelectedPlace,
    selectedCategory,
    setSelectedCategory,
  } = useMeetingStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [places, setPlaces] = useState<MeetingPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // 경로 정보 상태
  const [routes, setRoutes] = useState<Record<string, { distance: string; duration: string }>>({});
  const [calculatingRoutes, setCalculatingRoutes] = useState(false);

  // 초기 카테고리 설정
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedCategory('restaurant');
    }
  }, []);

  // 참여자나 중심점이 없으면 리다이렉트
  useEffect(() => {
    if (participants.length < 2) {
      alert('참여자가 충분하지 않습니다.');
      navigate('/');
      return;
    }
    if (!centerPlace) {
      alert('중간 지점 후보를 선택해주세요.');
      navigate('/places');
      return;
    }
  }, [participants, centerPlace, navigate]);

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!mapRef.current || !window.google || !centerPlace) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: centerPlace.lat, lng: centerPlace.lng },
      zoom: 15,
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

    // 선택된 중심 지역(후보지) 마커
    new google.maps.Marker({
      position: { lat: centerPlace.lat, lng: centerPlace.lng },
      map: mapInstance,
      title: centerPlace.name,
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
  }, [participants, centerPlace]);

  // 장소 검색 (카테고리 변경 시 실행)
  useEffect(() => {
    if (!map || !selectedCategory || !centerPlace) return;

    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.PlaceSearchRequest = {
      location: { lat: centerPlace.lat, lng: centerPlace.lng },
      radius: 1000, // 1km 반경 (구체적인 장소 탐색이므로 좁힘)
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
            handlePlaceClick(place);
          });

          markersRef.current.push(marker);
        });
      } else {
        setPlaces([]);
      }
      setLoading(false);
    });
  }, [map, selectedCategory, centerPlace]);

  // 경로 계산 함수
  const calculateRoutes = async (place: MeetingPlace) => {
    if (!window.google || !participants.length) return;

    setCalculatingRoutes(true);
    const service = new google.maps.DistanceMatrixService();
    const newRoutes: Record<string, { distance: string; duration: string }> = {};

    try {
      const promises = participants.map((p) => {
        return new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
          service.getDistanceMatrix(
            {
              origins: [{ lat: p.lat, lng: p.lng }],
              destinations: [{ lat: place.lat, lng: place.lng }],
              travelMode:
                p.transport === 'driving'
                  ? google.maps.TravelMode.DRIVING
                  : google.maps.TravelMode.TRANSIT,
            },
            (response, status) => {
              if (status === 'OK' && response) {
                resolve(response);
              } else {
                reject(status);
              }
            }
          );
        });
      });

      const results = await Promise.all(promises);

      results.forEach((response, index) => {
        const element = response.rows[0].elements[0];
        if (element.status === 'OK') {
          newRoutes[participants[index].id] = {
            distance: element.distance.text,
            duration: element.duration.text,
          };
        }
      });

      setRoutes(newRoutes);
    } catch (error) {
      console.error('Error calculating routes:', error);
    } finally {
      setCalculatingRoutes(false);
    }
  };

  const handlePlaceClick = (place: MeetingPlace) => {
    setSelectedPlace(place);
    map?.panTo({ lat: place.lat, lng: place.lng });
    map?.setZoom(16);

    // 해당 마커의 인포윈도우 열기 (선택적)
    const marker = markersRef.current.find((m) => m.getTitle() === place.name);
    if (marker) {
      google.maps.event.trigger(marker, 'click');
    }

    // 경로 계산 시작
    void calculateRoutes(place);
  };

  return (
    <div className='flex flex-col h-screen bg-gray-50 md:flex-row'>
      {/* 왼쪽: 장소 목록 또는 상세 정보 */}
      <div className='w-full md:w-1/3 h-1/2 md:h-full overflow-y-auto border-r border-gray-200 bg-white shadow-lg z-10 flex flex-col'>
        {selectedPlace ? (
          // 상세 정보 뷰
          <div className='p-6 flex-1 overflow-y-auto'>
            <button
              onClick={() => setSelectedPlace(null)}
              className='mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center'
            >
              ← 목록으로 돌아가기
            </button>

            {selectedPlace.photoUrl && (
              <img
                src={selectedPlace.photoUrl}
                alt={selectedPlace.name}
                className='w-full h-48 object-cover rounded-xl mb-6 shadow-md'
              />
            )}

            <h2 className='text-2xl font-bold text-gray-900 mb-2'>{selectedPlace.name}</h2>
            <p className='text-gray-600 mb-4'>{selectedPlace.address}</p>

            <div className='flex items-center mb-6'>
              {selectedPlace.rating && (
                <div className='flex items-center bg-yellow-50 px-3 py-1 rounded-lg'>
                  <span className='text-yellow-500 text-lg mr-1'>⭐</span>
                  <span className='font-bold text-gray-900'>{selectedPlace.rating}</span>
                  <span className='text-gray-500 text-sm ml-1'>
                    ({selectedPlace.userRatingsTotal})
                  </span>
                </div>
              )}
            </div>

            <div className='border-t border-gray-100 pt-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>참여자별 이동 정보</h3>
              {calculatingRoutes ? (
                <div className='flex justify-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                </div>
              ) : (
                <div className='space-y-3'>
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm'>
                          {p.name[0]}
                        </div>
                        <div>
                          <p className='font-medium text-gray-900'>{p.name}</p>
                          <p className='text-xs text-gray-500'>
                            {p.transport === 'driving' ? '🚗 자가용' : '🚌 대중교통'}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        {routes[p.id] ? (
                          <>
                            <p className='font-bold text-blue-600'>{routes[p.id].duration}</p>
                            <p className='text-xs text-gray-500'>{routes[p.id].distance}</p>
                          </>
                        ) : (
                          <span className='text-sm text-gray-400'>정보 없음</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className='w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors'
              onClick={() => alert('공유하기 기능은 준비 중입니다!')}
            >
              이 장소 공유하기
            </button>
          </div>
        ) : (
          // 목록 뷰
          <>
            <div className='p-4 sticky top-0 bg-white border-b border-gray-100 z-10'>
              <div className='flex items-center justify-between mb-4'>
                <button
                  onClick={() => navigate('/places')}
                  className='text-sm text-gray-500 hover:text-gray-700 flex items-center'
                >
                  ← 지역 다시 선택 ({centerPlace?.name})
                </button>
              </div>

              {/* 카테고리 토글 */}
              <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className='flex justify-center items-center h-64'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              </div>
            ) : (
              <div className='divide-y divide-gray-100 overflow-y-auto'>
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
                            <span className='text-yellow-500 font-medium mr-2'>
                              ⭐ {place.rating}
                            </span>
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
          </>
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
            <span>중심 지역</span>
          </div>
        </div>
      </div>
    </div>
  );
}

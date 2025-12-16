import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetingStore } from '../../store/meetingStore';
import type { MeetingPlace } from '../../types/meeting';

export function PlacesPage() {
  const navigate = useNavigate();
  const { participants, setCenterPlace } = useMeetingStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [candidates, setCandidates] = useState<MeetingPlace[]>([]);
  const [loading, setLoading] = useState(true);

  // 참여자가 없으면 리다이렉트
  useEffect(() => {
    if (participants.length < 2) {
      alert('참여자가 충분하지 않습니다.');
      navigate('/');
      return;
    }
  }, [participants, navigate]);

  // 중간 지점(Centroid) 계산
  const getCentroid = () => {
    if (participants.length === 0) return { lat: 37.5665, lng: 126.978 };
    const sumLat = participants.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = participants.reduce((sum, p) => sum + p.lng, 0);
    return {
      lat: sumLat / participants.length,
      lng: sumLng / participants.length,
    };
  };

  // 지도 초기화 및 후보지 검색
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const center = getCentroid();
    const mapInstance = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapTypeControl: false,
    });
    setMap(mapInstance);

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

    // 중간 지점(Centroid) 표시
    new google.maps.Marker({
      position: center,
      map: mapInstance,
      title: '중간 지점',
      icon: {
        path: google.maps.SymbolPath.STAR,
        scale: 10,
        fillColor: '#9CA3AF',
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 100,
    });

    // 주변 후보지(역, 번화가) 검색
    const service = new google.maps.places.PlacesService(mapInstance);
    const request: google.maps.places.PlaceSearchRequest = {
      location: center,
      radius: 3000, // 3km 반경
      type: 'subway_station', // 지하철역 우선 검색
      // rankBy: google.maps.places.RankBy.PROMINENCE, // 기본값
    };

    setLoading(true);
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const places: MeetingPlace[] = results.slice(0, 10).map((place) => ({
          placeId: place.place_id!,
          name: place.name!,
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
          address: place.vicinity || place.formatted_address || '',
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
        }));
        setCandidates(places);

        // 후보지 마커 표시
        places.forEach((place) => {
          const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map: mapInstance,
            title: place.name,
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            },
          });
          marker.addListener('click', () => handleSelectCandidate(place));
        });
      }
      setLoading(false);
    });
  }, [participants]);

  const handleSelectCandidate = (place: MeetingPlace) => {
    setCenterPlace(place);
    navigate('/result');
  };

  return (
    <div className='flex flex-col h-screen bg-gray-50 md:flex-row'>
      {/* 왼쪽: 후보지 목록 */}
      <div className='w-full md:w-1/3 h-1/2 md:h-full overflow-y-auto border-r border-gray-200 bg-white shadow-lg z-10'>
        <div className='p-6 sticky top-0 bg-white border-b border-gray-100 z-10'>
          <h1 className='text-2xl font-bold text-gray-900'>어디서 만날까요?</h1>
          <p className='text-gray-600 mt-2'>
            중간 지점 주변의 주요 역이나 랜드마크를 선택해주세요.
          </p>
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {candidates.map((place) => (
              <button
                key={place.placeId}
                onClick={() => handleSelectCandidate(place)}
                className='w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group'
              >
                <div>
                  <h3 className='font-semibold text-gray-900 group-hover:text-blue-700'>
                    {place.name}
                  </h3>
                  <p className='text-sm text-gray-500 mt-1'>{place.address}</p>
                </div>
                <span className='text-gray-400 group-hover:text-blue-500'>→</span>
              </button>
            ))}
            {candidates.length === 0 && (
              <div className='p-8 text-center text-gray-500'>주변에 적당한 후보지가 없습니다.</div>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 지도 */}
      <div className='w-full md:w-2/3 h-1/2 md:h-full relative'>
        <div ref={mapRef} className='w-full h-full' />
        <div className='absolute bottom-6 right-6 bg-white p-3 rounded-lg shadow-lg text-sm space-y-2'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-blue-600'></div>
            <span>참여자</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-gray-400'></div>
            <span>중간 지점(무게중심)</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-red-600'></div>
            <span>추천 후보지</span>
          </div>
        </div>
      </div>
    </div>
  );
}

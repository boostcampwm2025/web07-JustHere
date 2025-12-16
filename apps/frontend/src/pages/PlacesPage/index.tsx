import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetingStore } from '../../store/meetingStore';
import type { MeetingPlace } from '../../types/meeting';

interface ScoredPlace extends MeetingPlace {
  score?: number;
  avgDuration?: number;
  maxDuration?: number;
}

export function PlacesPage() {
  const navigate = useNavigate();
  const { participants, setCenterPlace } = useMeetingStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [candidates, setCandidates] = useState<ScoredPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatingScores, setCalculatingScores] = useState(false);

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

  // 점수 계산 함수
  const calculateScore = (durations: number[]) => {
    const n = durations.length;
    if (n === 0) return { score: Infinity, avg: Infinity, max: Infinity };
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / n;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    const spread = max - min;
    const lambda = 0.5; // 공평성 가중치
    const score = avg + lambda * spread;
    return { score, avg, max };
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
    };

    setLoading(true);
    service.nearbySearch(request, async (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        // 상위 5개만 추려서 상세 계산
        const initialPlaces: MeetingPlace[] = results.slice(0, 5).map((place) => ({
          placeId: place.place_id!,
          name: place.name!,
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
          address: place.vicinity || place.formatted_address || '',
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
        }));

        setCalculatingScores(true);
        const distanceService = new google.maps.DistanceMatrixService();

        try {
          const scoredPlaces = await Promise.all(
            initialPlaces.map(async (place) => {
              // 각 후보지에 대해 모든 참여자의 이동 시간 계산
              const durations: number[] = [];

              // DistanceMatrix 호출 (참여자 -> 후보지)
              // 참여자가 많을 경우 API 제한 고려하여 분할 요청 필요할 수 있음 (여기선 단순화)
              const response = await new Promise<google.maps.DistanceMatrixResponse | null>(
                (resolve) => {
                  distanceService.getDistanceMatrix(
                    {
                      origins: participants.map((p) => ({ lat: p.lat, lng: p.lng })),
                      destinations: [{ lat: place.lat, lng: place.lng }],
                      travelMode: google.maps.TravelMode.TRANSIT, // 대중교통 기준
                    },
                    (res, status) => {
                      if (status === 'OK') resolve(res);
                      else resolve(null);
                    }
                  );
                }
              );

              if (response) {
                response.rows.forEach((row) => {
                  const element = row.elements[0];
                  if (element.status === 'OK' && element.duration) {
                    // duration.value는 초 단위 -> 분 단위 변환
                    durations.push(element.duration.value / 60);
                  } else {
                    // 경로 없음 등의 경우 패널티 부여 (매우 큰 값)
                    durations.push(120);
                  }
                });
              } else {
                // API 실패 시 패널티
                participants.forEach(() => durations.push(120));
              }

              const { score, avg, max } = calculateScore(durations);
              return {
                ...place,
                score,
                avgDuration: Math.round(avg),
                maxDuration: Math.round(max),
              };
            })
          );

          // 점수가 낮은 순(좋은 순)으로 정렬
          scoredPlaces.sort((a, b) => (a.score || Infinity) - (b.score || Infinity));
          setCandidates(scoredPlaces);

          // 후보지 마커 표시 (순위별 색상 다르게 하거나 라벨 표시)
          scoredPlaces.forEach((place, index) => {
            const marker = new google.maps.Marker({
              position: { lat: place.lat, lng: place.lng },
              map: mapInstance,
              title: place.name,
              label: {
                text: `${index + 1}`,
                color: 'white',
                className: 'bg-red-600 px-2 py-1 rounded-full text-xs font-bold shadow-md',
              },
              zIndex: 100 - index, // 상위 순위가 위로 오게
            });
            marker.addListener('click', () => handleSelectCandidate(place));
          });
        } catch (error) {
          console.error('Error calculating scores:', error);
          // 에러 시 거리순(기본)으로라도 보여줌
          setCandidates(initialPlaces);
        } finally {
          setCalculatingScores(false);
        }
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
          <p className='text-gray-600 mt-2'>이동 시간과 공평성을 고려하여 추천된 순위입니다.</p>
        </div>

        {loading || calculatingScores ? (
          <div className='flex flex-col justify-center items-center h-64 space-y-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <p className='text-sm text-gray-500'>
              {loading ? '주변 역을 찾는 중...' : '최적의 장소를 계산하는 중...'}
            </p>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {candidates.map((place, index) => (
              <button
                key={place.placeId}
                onClick={() => handleSelectCandidate(place)}
                className='w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group'
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white ${
                      index === 0 ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 className='font-semibold text-gray-900 group-hover:text-blue-700'>
                      {place.name}
                    </h3>
                    <p className='text-sm text-gray-500 mt-1'>{place.address}</p>
                    {place.avgDuration && (
                      <div className='mt-2 flex gap-2 text-xs'>
                        <span className='bg-blue-100 text-blue-700 px-2 py-0.5 rounded'>
                          평균 {place.avgDuration}분
                        </span>
                        <span className='bg-gray-100 text-gray-600 px-2 py-0.5 rounded'>
                          최대 {place.maxDuration}분
                        </span>
                      </div>
                    )}
                  </div>
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
            <span>추천 후보지 (순위)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

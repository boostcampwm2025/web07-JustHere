import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { TransportSelector } from './TransportSelector';
import type { TransportMode } from '../../types/meeting';

interface AddParticipantFormProps {
  onAdd: (
    name: string,
    address: string,
    lat: number,
    lng: number,
    transport: TransportMode
  ) => void;
}

export function AddParticipantForm({ onAdd }: AddParticipantFormProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [transport, setTransport] = useState<TransportMode>('transit');
  const [selectedPlace, setSelectedPlace] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // 1) 타입 & ref 수정: AutocompleteService 사용
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // 2) 초기화 부분 수정
  useEffect(() => {
    let cancelled = false;

    const initPlaces = async () => {
      if (!window.google?.maps?.importLibrary) return;

      const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
      if (cancelled) return;

      placesLibRef.current = places;

      // ✅ AutocompleteService 초기화
      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new places.AutocompleteService();
      }

      // ✅ SessionToken 초기화
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }
    };

    void initPlaces();
    return () => {
      cancelled = true;
    };
  }, []);

  // 3) 검색 함수 수정: getPlacePredictions 메서드 사용
  const searchPredictions = async (input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) return;

    try {
      // ✅ 최신 API: getPlacePredictions는 Promise를 반환합니다
      const response = await autocompleteServiceRef.current.getPlacePredictions({
        input,
        sessionToken: sessionTokenRef.current ?? undefined,
      });

      setSuggestions(response.predictions);
    } catch (error: any) {
      // ZERO_RESULTS 등 에러 처리
      console.error('Failed to fetch suggestions', error);
      setSuggestions([]);
    }
  };

  const handleAddressInputChange = (value: string) => {
    setAddress(value);
    setSelectedPlace(null);

    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    setShowSuggestions(true);
    void searchPredictions(value);
  };

  const handlePredictionSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesLibRef.current) return;

    try {
      const place = new placesLibRef.current.Place({ id: prediction.place_id });
      const { place: fetchedPlace } = await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });

      if (!fetchedPlace.location) {
        alert('선택한 주소 정보를 불러오지 못했습니다. 다시 시도해주세요.');
        return;
      }

      const placeData = {
        address:
          fetchedPlace.formattedAddress || fetchedPlace.displayName || prediction.description,
        lat: fetchedPlace.location.lat(),
        lng: fetchedPlace.location.lng(),
      };

      setSelectedPlace(placeData);
      setAddress(placeData.address);
      setSuggestions([]);
      sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      setShowSuggestions(false);
    } catch (error) {
      console.error('Failed to load place details', error);
      alert('선택한 주소 정보를 불러오지 못했습니다. 다시 시도해주세요.');
    }
  };

  const handleBlur = () => {
    // 클릭 선택 시간을 주기 위해 약간 지연 후 닫기
    setTimeout(() => setShowSuggestions(false), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !selectedPlace) {
      alert('이름과 주소를 모두 입력해주세요.');
      return;
    }

    onAdd(name.trim(), selectedPlace.address, selectedPlace.lat, selectedPlace.lng, transport);

    // 폼 초기화
    setName('');
    setAddress('');
    setSelectedPlace(null);
    setTransport('transit');
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <TransportSelector value={transport} onChange={setTransport} />

      <div className='space-y-3'>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='이름을 입력하세요'
          className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />

        <div className='relative'>
          <input
            ref={addressInputRef}
            type='text'
            value={address}
            onChange={(e) => handleAddressInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder='주소를 검색하세요'
            autoComplete='off'
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />

          {showSuggestions && suggestions.length > 0 && (
            <ul className='absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto'>
              {suggestions.map((prediction) => (
                <li
                  key={prediction.place_id}
                  className='px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800'
                  onMouseDown={() => handlePredictionSelect(prediction)}
                >
                  {prediction.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        type='submit'
        className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors'
      >
        <Plus className='w-5 h-5' />
        <span>참여자 추가</span>
      </button>
    </form>
  );
}

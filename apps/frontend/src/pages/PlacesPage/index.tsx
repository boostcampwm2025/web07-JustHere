import { useNavigate } from 'react-router-dom';
import { useMeetingStore } from '../../store/meetingStore';
import type { PlaceCategory } from '../../types/meeting';

const CATEGORIES: { id: PlaceCategory; label: string; icon: string; description: string }[] = [
  { id: 'restaurant', label: '식당', icon: '🍽️', description: '맛있는 식사를 함께해요' },
  { id: 'cafe', label: '카페', icon: '☕', description: '커피 한잔의 여유' },
  { id: 'bar', label: '술집', icon: '🍺', description: '가볍게 한잔' },
  { id: 'culture', label: '문화생활', icon: '🎬', description: '영화, 전시 관람' },
  { id: 'shopping', label: '쇼핑', icon: '🛍️', description: '쇼핑몰 구경' },
  { id: 'park', label: '공원', icon: '🌳', description: '산책과 휴식' },
];

export function PlacesPage() {
  const navigate = useNavigate();
  const { setSelectedCategory } = useMeetingStore();

  const handleSelectCategory = (category: PlaceCategory) => {
    setSelectedCategory(category);
    navigate('/result');
  };

  return (
    <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-3xl mx-auto'>
        <div className='text-center mb-12'>
          <h1 className='text-3xl font-bold text-gray-900'>어떤 장소를 찾으시나요?</h1>
          <p className='mt-4 text-lg text-gray-600'>만남의 목적에 맞는 장소 유형을 선택해주세요</p>
        </div>

        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleSelectCategory(category.id)}
              className='relative group bg-white p-6 focus:outline-none rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-500 text-left'
            >
              <div className='flex items-center justify-between mb-4'>
                <span className='text-4xl'>{category.icon}</span>
                <div className='h-6 w-6 rounded-full border-2 border-gray-200 group-hover:border-blue-500 transition-colors' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors'>
                {category.label}
              </h3>
              <p className='mt-2 text-sm text-gray-500'>{category.description}</p>
            </button>
          ))}
        </div>

        <div className='mt-12 flex justify-center'>
          <button
            onClick={() => navigate(-1)}
            className='text-gray-500 hover:text-gray-700 font-medium px-6 py-2'
          >
            이전으로
          </button>
        </div>
      </div>
    </div>
  );
}

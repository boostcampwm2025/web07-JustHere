import type { TutorialPlace } from '@/pages/landing/types'

export const TUTORIAL_PLACES: TutorialPlace[] = [
  { id: 1, name: '우리할매떡볶이경주지점', category: '분식점', rating: 4.5, reviews: 2, address: '대한민국 경상북도 경주시 용강동 1645' },
  { id: 2, name: '우방정통떡볶이', category: '테이크아웃 전문', rating: 5.0, reviews: 1, address: '대한민국 경상북도 경주시 배동로57번길 20' },
  {
    id: 3,
    name: '올패로국물떡볶이경주황성점',
    category: '테이크아웃 전문',
    rating: 5.0,
    reviews: 1,
    address: '대한민국 경상북도 경주시 황성길16번길 34',
  },
  { id: 4, name: '신불떡볶이', category: '분식점', rating: 4.3, reviews: 3, address: '대한민국 경상북도 경주시 화랑로 521-31' },
]

export const PLACE_TUTORIAL_STEPS = [
  { title: '장소 키워드 검색', description: '검색창에 원하는 장소를 입력하세요. 검색 결과는 나만 볼 수 있어요.', action: 'search' },
  {
    title: '캔버스에 추가하기',
    description: '마음에 드는 장소의 캔버스 버튼을 클릭하면 협업 캔버스에 장소 카드가 추가됩니다.',
    action: 'addToCanvas',
  },
  {
    title: '후보 리스트에 등록',
    description: '후보등록 버튼을 클릭하면 모든 참여자가 볼 수 있는 후보 리스트에 추가됩니다.',
    action: 'addToCandidate',
  },
  {
    title: '지도에서 확인하기',
    description: '지도 탭으로 전환해 장소의 위치를 확인하세요. 핀을 클릭하면 장소의 상세정보를 볼 수 있습니다.',
    action: 'viewMap',
  },
]

export const PRESET_CATEGORIES = [{ name: '음식점' }, { name: '카페' }, { name: '술집' }, { name: '가볼만한곳' }]

export const CANVAS_TUTORIAL_STEPS = [
  {
    title: '카테고리 추가하기',
    description: '+ 버튼을 클릭해 모임 유형을 선택하세요. 카테고리별로 별도의 캔버스가 생성됩니다.',
    action: 'addCategory',
    highlight: 'category',
  },
  {
    title: '의견 공유하기',
    description: '포스트잇 버튼을 클릭해 의견을 추가해보세요. 자유롭게 내용을 작성할 수 있습니다.',
    action: 'addSticky',
    highlight: 'sticky',
  },
  {
    title: '장소 카드 등록하기',
    description: '장소 카드 버튼을 클릭해 캔버스에 장소를 추가해보세요. 모임 후보 장소를 한눈에 모아볼 수 있습니다.',
    action: 'addPlaceCard',
    highlight: 'place',
  },
  {
    title: '캔버스 조작하기',
    description: '선택 커서로 포스트잇을 드래그해보세요. 이동 커서를 사용하면 캔버스 전체를 이동할 수 있습니다.',
    action: 'moveElement',
    highlight: 'move',
  },
  {
    title: '실시간 협업하기',
    description: '같은 카테고리에 있는 참여자들의 커서가 실시간으로 표시됩니다. / 키를 눌러 커서 챗으로 소통할 수 있습니다.',
    action: 'showCursors',
    highlight: 'cursors',
  },
]

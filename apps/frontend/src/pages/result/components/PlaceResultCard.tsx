interface ResultPlace {
  id: string
  name: string
  placeId: string
}

interface PlaceResultCardProps {
  place: ResultPlace
}

export const PlaceResultCard = ({ place }: PlaceResultCardProps) => {
  const placeUrl = `https://place.map.kakao.com/${place.placeId}`

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden min-w-sm flex-1">
      {/* Kakao Place iframe */}
      <div className="flex-1 min-h-[500px]">
        <iframe src={placeUrl} title={`${place.name} 상세 정보`} className="w-full h-full border-0" allow="fullscreen" />
      </div>
    </div>
  )
}

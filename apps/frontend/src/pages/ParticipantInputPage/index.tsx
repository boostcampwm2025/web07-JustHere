import { useNavigate } from 'react-router-dom';
import { useMeetingStore } from '../../store/meetingStore';
import { ParticipantCard } from './ParticipantCard';
import { AddParticipantForm } from './AddParticipantForm';
import type { TransportMode } from '../../types/meeting';

export function ParticipantInputPage() {
  const navigate = useNavigate();
  const { participants, addParticipant, removeParticipant } = useMeetingStore();

  const handleAddParticipant = (
    name: string,
    address: string,
    lat: number,
    lng: number,
    transport: TransportMode
  ) => {
    addParticipant({
      id: Date.now().toString(),
      name,
      address,
      lat,
      lng,
      transport,
    });
  };

  const handleFindMidpoint = () => {
    if (participants.length < 2) {
      alert('참여자를 2명 이상 추가해주세요.');
      return;
    }
    navigate('/places');
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-2xl mx-auto p-6 space-y-6'>
        {/* 헤더 */}
        <div className='text-center py-4'>
          <h1 className='text-2xl font-bold text-gray-900'>어디서 만날까요?</h1>
          <p className='text-gray-600 mt-2'>만남의 시작점을 입력해주세요</p>
        </div>

        {/* 참여자 리스트 */}
        {participants.length > 0 && (
          <div className='space-y-3'>
            <h2 className='text-sm font-semibold text-gray-700'>
              참여자 목록 ({participants.length}명)
            </h2>
            {participants.map((participant, index) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                index={index}
                onRemove={removeParticipant}
              />
            ))}
          </div>
        )}

        {/* 참여자 추가 폼 */}
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <AddParticipantForm onAdd={handleAddParticipant} />
        </div>

        {/* 중간 위치 찾기 버튼 */}
        <button
          onClick={handleFindMidpoint}
          disabled={participants.length < 2}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
            participants.length >= 2
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          중간 위치 찾기
        </button>
      </div>
    </div>
  );
}

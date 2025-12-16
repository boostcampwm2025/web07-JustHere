import { X, Train, Car } from 'lucide-react';
import type { Participant } from '../../types/meeting';

interface ParticipantCardProps {
  participant: Participant;
  index: number;
  onRemove: (id: string) => void;
}

export function ParticipantCard({ participant, index, onRemove }: ParticipantCardProps) {
  return (
    <div className='flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm'>
      <div className='flex items-center gap-3 flex-1'>
        <span className='text-sm font-semibold text-gray-500'>{index + 1}</span>

        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-gray-900'>{participant.name}</span>
            {participant.transport === 'transit' ? (
              <Train className='w-4 h-4 text-blue-600' />
            ) : (
              <Car className='w-4 h-4 text-green-600' />
            )}
          </div>
          <p className='text-sm text-gray-500 mt-0.5'>{participant.address}</p>
        </div>
      </div>

      <button
        onClick={() => onRemove(participant.id)}
        className='p-1 hover:bg-gray-100 rounded-full transition-colors'
        aria-label='참여자 삭제'
      >
        <X className='w-5 h-5 text-gray-400' />
      </button>
    </div>
  );
}

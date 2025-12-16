import { Train, Car } from 'lucide-react';
import type { TransportMode } from '../../types/meeting';

interface TransportSelectorProps {
  value: TransportMode;
  onChange: (mode: TransportMode) => void;
}

export function TransportSelector({ value, onChange }: TransportSelectorProps) {
  return (
    <div className='flex gap-2'>
      <button
        type='button'
        onClick={() => onChange('transit')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
          value === 'transit'
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        }`}
      >
        <Train className='w-5 h-5' />
        <span className='font-medium'>대중교통</span>
      </button>

      <button
        type='button'
        onClick={() => onChange('driving')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
          value === 'driving'
            ? 'border-green-500 bg-green-50 text-green-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        }`}
      >
        <Car className='w-5 h-5' />
        <span className='font-medium'>자가용</span>
      </button>
    </div>
  );
}

'use client';
import ScrollFieldPicker from './ScrollFieldPicker';

interface Props {
  value: string;
  onChange: (val: string) => void;
  /** Swims are entered/shown in metres (e.g. "1500"), not fractional km. */
  exerciseType?: string;
}

export default function DistancePicker({ value, onChange, exerciseType }: Props) {
  const isSwim = exerciseType === 'swim';
  return (
    <ScrollFieldPicker
      label="Distance"
      unit={isSwim ? 'm' : 'km'}
      value={value}
      onChange={onChange}
      max={isSwim ? 20000 : 999}
      decimals={isSwim ? 0 : 2}
      suggestion={0}
      placeholder={isSwim ? 'e.g. 1500' : 'e.g. 5.25'}
    />
  );
}

'use client';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function DistancePicker({ value, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0 && num <= 160) {
      onChange(String(Math.round(num * 100) / 100));
    } else if (v === '' || v === '0') {
      onChange('');
    }
  };

  return (
    <div className="flex items-center rounded-lg border border-[#334155] bg-[#0F172A] focus-within:border-[#475569] overflow-hidden">
      <input
        type="number"
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-[#475569] outline-none min-w-0"
        placeholder="e.g. 5.25"
        min="0.01"
        max="160"
        step="0.01"
        value={value}
        onChange={handleChange}
      />
      <span className="text-xs text-[#475569] px-3 flex-shrink-0">km</span>
    </div>
  );
}

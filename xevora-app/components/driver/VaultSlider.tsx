"use client";

type VaultSliderProps = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export default function VaultSlider({
  value,
  onChange,
  min = 15,
  max = 30,
  disabled = false,
}: VaultSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between font-jb text-xs text-[#4E6D92]">
        <span>{min}%</span>
        <span className="text-[#F59E0B]">{Math.round(value)}%</span>
        <span>{max}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1a1510] accent-[#F59E0B] disabled:opacity-50"
      />
    </div>
  );
}

"use client";

interface FilterSelectorProps {
  activeFilter: string;
  warmCool: number; // -100 ~ +100
  onFilterChange?: (filterId: string) => void;
  onWarmCoolChange?: (value: number) => void;
}

export default function FilterSelector({
  activeFilter,
  warmCool,
  onFilterChange,
  onWarmCoolChange,
}: FilterSelectorProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* ── Filter toggle: 원본 / 흑백 ── */}
      <div className="flex items-center gap-2">
        {[
          { id: "normal", label: "Original" },
          { id: "grayscale", label: "B&W" },
        ].map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange?.(f.id)}
              className={`sketch-border rounded-md px-4 py-1.5 text-[10px] font-medium tracking-wider transition-all duration-150
                ${
                  isActive
                    ? "bg-[var(--charcoal)] text-white/90"
                    : "bg-[var(--paper)] text-[var(--charcoal-light)] opacity-70 hover:opacity-100"
                }
              `}
              style={{ border: `1px solid ${isActive ? 'var(--charcoal)' : 'rgba(58,54,50,0.25)'}` }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Warm / Cool slider ── */}
      <div className="flex w-full max-w-[300px] items-center gap-2.5 px-1">
        {/* Snowflake icon (cool) */}
        <svg
          className="h-5 w-5 shrink-0 text-sky-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
          {/* Branches */}
          <line x1="12" y1="2" x2="9.5" y2="4.5" />
          <line x1="12" y1="2" x2="14.5" y2="4.5" />
          <line x1="12" y1="22" x2="9.5" y2="19.5" />
          <line x1="12" y1="22" x2="14.5" y2="19.5" />
        </svg>

        {/* Slider */}
        <input
          type="range"
          min={-100}
          max={100}
          value={warmCool}
          onChange={(e) => onWarmCoolChange?.(Number(e.target.value))}
          className="sketch-slider w-full"
        />

        {/* Sun icon (warm) */}
        <svg
          className="h-5 w-5 shrink-0 text-orange-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
        </svg>
      </div>

    </div>
  );
}

"use client";

import { useCallback } from "react";

export interface PolaroidShot {
  id: number;
  captured: boolean;
  timestamp?: string;
  imageData?: string;
}

interface PhotoStripProps {
  shots: PolaroidShot[];
  onSave?: () => void;
  onReset?: () => void;
}

export default function PhotoStrip({ shots, onSave, onReset }: PhotoStripProps) {
  const capturedCount = shots.filter((s) => s.captured).length;

  /** Download a single photo */
  const handleDownloadSingle = useCallback((shot: PolaroidShot) => {
    if (!shot.imageData) return;
    const link = document.createElement("a");
    link.download = `polaroid-${shot.id}-${Date.now()}.jpg`;
    link.href = shot.imageData;
    link.click();
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center gap-4">
      {/* Title — pencil-written feel */}
      <h2 className="text-[9px] font-medium uppercase tracking-[0.35em] text-[var(--charcoal-light)] opacity-70">
        Prints
      </h2>

      {/* Polaroid cards — portrait, paper texture with inline date */}
      <div className="flex w-full flex-col gap-4">
        {shots.map((shot, idx) => {
          const rotation = idx % 2 === 0 ? -1.0 : 0.7;
          return (
            <div
              key={shot.id}
              className={`group relative mx-auto w-[120px] transition-transform duration-300 hover:scale-[1.03] ${
                shot.captured ? "animate-slide-up" : ""
              }`}
              style={{
                animationDelay: shot.captured ? `${idx * 0.16}s` : undefined,
                animationFillMode: "both",
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* Polaroid frame — pencil border + paper texture */}
              <div
                className="polaroid-frame rounded-[4px] bg-white p-[5px] pb-6"
                style={{
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.03)",
                }}
              >
                {/* Photo area — PORTRAIT 3:4 */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2px] bg-[#ece8e1]">
                  {shot.captured && shot.imageData ? (
                    <div className="relative h-full w-full">
                      {/* Actual captured photo with developing animation + vintage filter */}
                      <img
                        src={shot.imageData}
                        alt={`Photo ${shot.id}`}
                        className="animate-photo-develop h-full w-full object-cover"
                        style={{
                          animationDelay: `${idx * 0.15}s`,
                        }}
                      />
                      {/* Film grain noise overlay */}
                      <div className="film-grain pointer-events-none absolute inset-0" />
                      {/* Vignette overlay */}
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.15) 100%)",
                        }}
                      />
                      {/* Timestamp inside photo — bottom right, analog feel */}
                      <span className="absolute bottom-[3px] right-[4px] font-mono text-[6px] leading-none text-white/60 drop-shadow-sm">
                        {shot.timestamp}
                      </span>
                      {/* Download icon on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(shot);
                        }}
                        className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="다운로드"
                      >
                        <svg
                          className="h-2 w-2 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : shot.captured ? (
                    <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-[#e8e4dd] to-[#d9d5ce]">
                      <span className="text-base opacity-25">📸</span>
                      <span className="absolute bottom-[3px] right-[4px] font-mono text-[6px] leading-none text-[#8a7e72]/50">
                        {shot.timestamp}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="font-mono text-[7px] text-[var(--charcoal-light)] opacity-15">
                        #{shot.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Save strip button */}
        <button
          onClick={onSave}
          disabled={capturedCount === 0}
          className="sketch-border flex items-center gap-1.5 rounded-md bg-[var(--paper)] px-3.5 py-1.5 text-[8px] font-medium uppercase tracking-wider text-[var(--charcoal)] opacity-80 transition-all hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ border: "1px solid rgba(58,54,50,0.25)" }}
        >
          <svg
            className="h-2.5 w-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Save
        </button>

        {/* Reset button */}
        {capturedCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[8px] font-medium uppercase tracking-wider text-[var(--charcoal-light)] opacity-50 transition-all hover:opacity-80"
          >
            <svg
              className="h-2.5 w-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

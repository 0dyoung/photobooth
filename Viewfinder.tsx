"use client";

import { RefObject } from "react";

interface ViewfinderProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  activeFilter?: string;
  warmCool?: number;
  webcamReady: boolean;
  webcamError: string | null;
  onRetry?: () => void;
}

export default function Viewfinder({
  videoRef,
  activeFilter = "normal",
  warmCool = 0,
  webcamReady,
  webcamError,
  onRetry,
}: ViewfinderProps) {
  let tintBg = "transparent";
  if (warmCool > 10) {
    const a = Math.min(warmCool / 100, 1) * 0.12;
    tintBg = `rgba(255,170,60,${a})`;
  } else if (warmCool < -10) {
    const a = Math.min(Math.abs(warmCool) / 100, 1) * 0.12;
    tintBg = `rgba(100,180,255,${a})`;
  }

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      {/* Pencil-sketch double-line border with wobble distortion */}
      <div className="pencil-double-rect pointer-events-none absolute -inset-[1px] z-10 rounded-lg" />

      {/* Viewfinder screen */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#252220]"
        style={{
          filter: activeFilter === "grayscale" ? "grayscale(100%)" : "none",
        }}
      >
        {/* Video element — always rendered for ref attachment */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            webcamReady ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Loading state */}
        {!webcamReady && !webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#6b6560]/30 border-t-[#a89880]/60" />
            <span className="text-[8px] font-light tracking-wider text-[#a89880]/50">
              Connecting...
            </span>
          </div>
        )}

        {/* Error state */}
        {webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
            <svg className="h-6 w-6 text-[#a89880]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            <span className="text-center text-[7px] leading-relaxed text-[#a89880]/60">
              카메라에 접근할 수 없습니다
            </span>
            <button
              onClick={onRetry}
              className="rounded-md bg-[#3a3632]/60 px-3 py-1 text-[7px] tracking-wider text-[#e8e4dd]/70 transition-colors hover:bg-[#3a3632]/80"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Warm/cool tint overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: tintBg }}
        />

        {/* Corner marks — thin pencil lines */}
        <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full" preserveAspectRatio="none">
          <line x1="6%" y1="8%" x2="15%" y2="8%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="6%" y1="8%" x2="6%" y2="15%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="85%" y1="8%" x2="94%" y2="8%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="94%" y1="8%" x2="94%" y2="15%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="6%" y1="92%" x2="15%" y2="92%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="6%" y1="85%" x2="6%" y2="92%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="85%" y1="92%" x2="94%" y2="92%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          <line x1="94%" y1="85%" x2="94%" y2="92%" stroke="#aaa" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" strokeDasharray="4 2" />
          {/* Crosshair — very faint */}
          <line x1="48%" y1="50%" x2="52%" y2="50%" stroke="#ccc" strokeWidth="0.4" />
          <line x1="50%" y1="48%" x2="50%" y2="52%" stroke="#ccc" strokeWidth="0.4" />
        </svg>

        {/* REC indicator */}
        <div className="absolute right-2 top-2 z-[3] flex items-center gap-1">
          <span className="h-1 w-1 animate-pulse rounded-full bg-red-400/50" />
          <span className="font-mono text-[6px] font-medium tracking-wider text-red-400/35">
            REC
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Viewfinder from "@/components/Viewfinder";
import CaptureButton from "@/components/CaptureButton";
import FilterSelector from "@/components/FilterSelector";
import PhotoStrip from "@/components/PhotoStrip";
import type { PolaroidShot } from "@/components/PhotoStrip";
import { useWebcam } from "@/hooks/useWebcam";

type ViewStatus = "exterior" | "interior" | "camera";
const MAX_SHOTS = 4;

function timestamp() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  /* ── View Status: 3-stage intro flow ── */
  const [viewStatus, setViewStatus] = useState<ViewStatus>("exterior");
  const [curtainOpening, setCurtainOpening] = useState(false);

  const {
    videoRef,
    isReady: webcamReady,
    error: webcamError,
    retry,
  } = useWebcam(viewStatus === "camera");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [flash, setFlash] = useState(false);
  const [ejecting, setEjecting] = useState(false);
  const [wobbleSeed, setWobbleSeed] = useState(2);
  const [jiggling, setJiggling] = useState(false);
  const [ejectingImage, setEjectingImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [warmCool, setWarmCool] = useState(0);
  const [shots, setShots] = useState<PolaroidShot[]>(
    Array.from({ length: MAX_SHOTS }, (_, i) => ({
      id: i + 1,
      captured: false,
    }))
  );

  const capturedCount = shots.filter((s) => s.captured).length;
  const allDone = capturedCount >= MAX_SHOTS;

  // Lens glow color based on warm/cool
  let glowColor = "rgba(180,175,165,0.18)";
  if (activeFilter === "grayscale") glowColor = "rgba(130,130,130,0.25)";
  if (warmCool > 10) {
    const a = Math.min(warmCool / 100, 1) * 0.35;
    glowColor = `rgba(255,170,60,${a})`;
  } else if (warmCool < -10) {
    const a = Math.min(Math.abs(warmCool) / 100, 1) * 0.35;
    glowColor = `rgba(100,180,255,${a})`;
  }

  /** Capture a frame from the webcam video with filters applied */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Center-crop to 3:4 portrait for polaroid frames
    const targetRatio = 3 / 4;
    let sw: number, sh: number, sx: number, sy: number;
    if (vw / vh > targetRatio) {
      sh = vh;
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = vw / targetRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }

    canvas.width = 600;
    canvas.height = 800;

    // Mirror horizontally (selfie mode)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Vintage analog filter chain: noticeable blur + high contrast + muted saturation
    const filterChain = "blur(1.0px) contrast(1.3) brightness(1.04) saturate(0.8)";
    ctx.filter = filterChain;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 800);
    ctx.restore();
    ctx.filter = "none";

    const isGrayscale = activeFilter === "grayscale";

    // Apply grayscale at pixel level — guaranteed B&W regardless of browser
    if (isGrayscale) {
      const bwData = ctx.getImageData(0, 0, 600, 800);
      const bwPx = bwData.data;
      for (let i = 0; i < bwPx.length; i += 4) {
        const gray = bwPx[i] * 0.299 + bwPx[i + 1] * 0.587 + bwPx[i + 2] * 0.114;
        bwPx[i] = gray;
        bwPx[i + 1] = gray;
        bwPx[i + 2] = gray;
      }
      ctx.putImageData(bwData, 0, 0);
    }

    // Strong sepia/warm tone overlay — vintage photograph feel (skip for B&W)
    if (!isGrayscale) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(245, 215, 140, 0.09)";
      ctx.fillRect(0, 0, 600, 800);
    }

    // Warm/cool color temperature overlay (skip for B&W)
    if (!isGrayscale) {
      if (warmCool > 10) {
        const a = Math.min(warmCool / 100, 1) * 0.12;
        ctx.fillStyle = `rgba(255,170,60,${a})`;
        ctx.fillRect(0, 0, 600, 800);
      } else if (warmCool < -10) {
        const a = Math.min(Math.abs(warmCool) / 100, 1) * 0.12;
        ctx.fillStyle = `rgba(100,180,255,${a})`;
        ctx.fillRect(0, 0, 600, 800);
      }
    }

    // Enhanced vignette — darker corners, wider gradient
    const grad = ctx.createRadialGradient(300, 400, 140, 300, 400, 480);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.65, "rgba(0,0,0,0.03)");
    grad.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 800);

    // Film grain noise — visible random luminance variation
    const imgData = ctx.getImageData(0, 0, 600, 800);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const grain = (Math.random() - 0.5) * 35;
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + grain));
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + grain));
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.92);
  }, [activeFilter, warmCool, videoRef]);

  const handleCapture = useCallback(() => {
    if (allDone || ejecting || !webcamReady) return;

    // Capture frame immediately
    const imageData = captureFrame();
    if (!imageData) return;

    // Wobble seed change — living sketch feel
    setWobbleSeed((prev) => prev + Math.floor(Math.random() * 3) + 1);

    // Jiggle camera body
    setJiggling(true);
    setTimeout(() => setJiggling(false), 550);

    // Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 500);

    // Eject animation with captured image
    setEjectingImage(imageData);
    setEjecting(true);
    setTimeout(() => {
      setEjecting(false);
      setEjectingImage(null);
    }, 1400);

    // Add to gallery after eject partially completes
    setTimeout(() => {
      setShots((prev) => {
        const next = [...prev];
        const idx = next.findIndex((s) => !s.captured);
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            captured: true,
            timestamp: timestamp(),
            imageData: imageData,
          };
        }
        return next;
      });
    }, 900);
  }, [allDone, ejecting, webcamReady, captureFrame]);

  /** Step 1→2: Enter booth — curtain slide then interior */
  const handleEnterBooth = useCallback(() => {
    setCurtainOpening(true);
    setTimeout(() => {
      setCurtainOpening(false);
      setViewStatus("interior");
    }, 900);
  }, []);

  /** Step 2→3: Sit down — interior → camera */
  const handleSitDown = useCallback(() => {
    setViewStatus("camera");
  }, []);

  /** Back: interior → exterior */
  const handleGoOutside = useCallback(() => {
    setViewStatus("exterior");
  }, []);

  /** Back: camera → interior */
  const handleBackToSeat = useCallback(() => {
    setViewStatus("interior");
  }, []);

  /** Reset all shots */
  const handleReset = useCallback(() => {
    setShots(
      Array.from({ length: MAX_SHOTS }, (_, i) => ({
        id: i + 1,
        captured: false,
      }))
    );
  }, []);

  /** Download all captured photos as a strip image */
  const handleSaveStrip = useCallback(async () => {
    const captured = shots.filter((s) => s.captured && s.imageData);
    if (captured.length === 0) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const pw = 420;
    const photoW = 380;
    const photoH = Math.round(photoW * (4 / 3));
    const photoY = 20;
    const bottomMargin = 60;
    const polaroidH = photoY + photoH + bottomMargin;
    const gap = 24;
    const padX = 40;
    const padY = 40;

    canvas.width = pw + padX * 2;
    canvas.height =
      padY * 2 + polaroidH * captured.length + gap * (captured.length - 1);

    // Paper background
    ctx.fillStyle = "#f5f1ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < captured.length; i++) {
      const shot = captured[i];
      const y = padY + i * (polaroidH + gap);

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.08)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      // White polaroid frame
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(padX, y, pw, polaroidH, 4);
      ctx.fill();

      ctx.shadowColor = "transparent";

      // Photo
      const img = new Image();
      img.src = shot.imageData!;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      ctx.drawImage(img, padX + 20, y + photoY, photoW, photoH);

      // Timestamp text
      if (shot.timestamp) {
        ctx.font = "12px monospace";
        ctx.fillStyle = "rgba(138,126,114,0.6)";
        ctx.textAlign = "right";
        ctx.fillText(shot.timestamp, padX + pw - 25, y + polaroidH - 18);
      }
    }

    const link = document.createElement("a");
    link.download = `polaroid-strip-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [shots]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-dot-pattern paper-noise px-4 py-8 sm:px-8 overflow-hidden">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ═══ SVG Pencil Filter — clean lines, variable stroke width ═══ */}
      <svg className="pointer-events-none fixed h-0 w-0" aria-hidden>
        <defs>
          <filter id="pencil-wobble" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" seed={wobbleSeed} result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="1" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Clean pencil texture for strokes */}
          <filter id="pencil-stroke">
            <feMorphology operator="dilate" radius="0.3" />
          </filter>
        </defs>
      </svg>

      {/* Flash overlay */}
      {flash && (
        <div className="animate-flash pointer-events-none fixed inset-0 z-50 bg-white" />
      )}

      <AnimatePresence mode="wait">

        {/* ═══════════ STEP 1: Booth Exterior ═══════════ */}
        {viewStatus === "exterior" && (
          <motion.div
            key="exterior"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center justify-center w-full"
          >
            {/* Booth Body */}
            <div className="booth-border relative bg-[var(--paper)] w-[340px] sm:w-[420px] h-[440px] sm:h-[520px] rounded-[4px] overflow-hidden">

              {/* ── Sign Board ── */}
              <div className="sign-border absolute -top-[1px] left-1/2 -translate-x-1/2 w-[72%] h-[46px] bg-[#eee9e0] flex items-center justify-center z-10 rounded-b-[3px]">
                <span
                  className="text-[15px] sm:text-[17px] font-medium tracking-[0.28em] text-[var(--charcoal)] select-none uppercase"
                  style={{ fontFamily: 'var(--font-josefin)' }}
                >
                  Photo Booth
                </span>
              </div>

              {/* ── Left Wall: Mini Polaroid Samples ── */}
              <div className="absolute left-[16px] sm:left-[22px] top-[64px] flex flex-col gap-[12px] z-[5]">
                {[[-3, '#d4cec4', '#c8c0b4'], [2, '#cdc5b8', '#bfb6a8'], [-1, '#d8d2ca', '#cac3b8'], [3, '#d0c8bc', '#c4bbb0']].map(([rot, from, to], i) => (
                  <div key={i} className="mini-polaroid" style={{ transform: `rotate(${rot}deg)` }}>
                    <div className="w-[34px] h-[40px] rounded-[1px]" style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
                      <div className="w-full h-full opacity-20" style={{
                        background: `repeating-linear-gradient(${45 + i * 30}deg, transparent 0px, transparent ${3 + i}px, rgba(74,68,64,0.06) ${3 + i}px, rgba(74,68,64,0.06) ${4 + i}px)`
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Interior darkness ── */}
              <div className="interior-wall absolute inset-0 top-[44px] z-[1]" />

              {/* ── Faint wall lines ── */}
              <svg className="absolute inset-0 top-[44px] z-[2] pointer-events-none opacity-[0.05]" width="100%" height="100%">
                <line x1="14%" y1="28%" x2="14%" y2="88%" stroke="var(--pencil)" strokeWidth="0.6" strokeDasharray="6 14" strokeLinecap="round" />
                <line x1="21%" y1="22%" x2="21%" y2="92%" stroke="var(--pencil)" strokeWidth="0.5" strokeDasharray="4 16" strokeLinecap="round" />
              </svg>

              {/* ── Right: Curtain ── */}
              <div className={`absolute right-0 top-[44px] bottom-0 w-[55%] z-[8] curtain-stripes bg-[var(--paper)] transition-transform duration-[800ms] ease-in-out ${curtainOpening ? 'translate-x-full' : ''}`}>
                {/* Curtain rod */}
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[var(--pencil)] opacity-25 rounded-full" />
                {/* Fold overlay */}
                <div className="curtain-folds absolute inset-0" />
                {/* Pencil-drawn vertical accent lines */}
                <svg className="absolute inset-0 pointer-events-none opacity-[0.06]" width="100%" height="100%">
                  <line x1="28%" y1="1%" x2="27%" y2="99%" stroke="var(--pencil)" strokeWidth="0.8" strokeLinecap="round" />
                  <line x1="54%" y1="0%" x2="56%" y2="100%" stroke="var(--pencil)" strokeWidth="0.6" strokeLinecap="round" />
                  <line x1="79%" y1="1%" x2="77%" y2="99%" stroke="var(--pencil)" strokeWidth="0.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* ── ENTER Button ── */}
              <button
                onClick={handleEnterBooth}
                disabled={curtainOpening}
                className="absolute inset-0 top-[44px] z-[10] flex items-center justify-center cursor-pointer group disabled:cursor-default"
                aria-label="부스 입장하기"
              >
                <div className={`flex flex-col items-center gap-2 select-none ${curtainOpening ? 'opacity-0 transition-opacity duration-500' : 'animate-enter-breathe'}`}>
                  <span
                    className="text-[26px] sm:text-[32px] tracking-[0.25em] text-[var(--paper)] opacity-90 group-hover:opacity-100 transition-all duration-300 uppercase"
                    style={{ fontFamily: 'var(--font-shadows)', textShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' }}
                  >
                    ENTER →
                  </span>
                  <span
                    className="text-[13px] sm:text-[14px] tracking-[0.15em] text-[var(--paper)] opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                    style={{ fontFamily: 'var(--font-shadows)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                  >
                    click the curtain
                  </span>
                </div>
              </button>

              {/* ── Floor line ── */}
              <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-[#c4b4a0]/15 z-[3]" />
            </div>

            {/* ── Ground shadow ── */}
            <div className="mt-1.5 h-[5px] w-[300px] sm:w-[380px] rounded-[50%] opacity-[0.05]"
              style={{ background: 'radial-gradient(ellipse, var(--pencil) 0%, transparent 70%)' }}
            />

            {/* ── Legs ── */}
            <svg className="w-[340px] sm:w-[420px] h-[14px] pointer-events-none" style={{ opacity: 0.2, marginTop: '-3px' }}>
              <line x1="11%" y1="0" x2="9%" y2="14" stroke="var(--pencil)" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="89%" y1="0" x2="91%" y2="14" stroke="var(--pencil)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </motion.div>
        )}

        {/* ═══════════ STEP 2: Booth Interior ═══════════ */}
        {viewStatus === "interior" && (
          <motion.div
            key="interior"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3, filter: "blur(6px)" }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center justify-center w-full"
          >
            {/* Interior frame — looking inside the booth */}
            <div className="booth-border relative w-[360px] sm:w-[460px] h-[420px] sm:h-[500px] rounded-[4px] overflow-hidden">

              {/* Wall */}
              <div className="interior-wall absolute inset-0" />

              {/* ← Go Outside button */}
              <button
                onClick={handleGoOutside}
                className="absolute top-3 left-3 z-[10] flex items-center gap-1 cursor-pointer group opacity-40 hover:opacity-70 transition-opacity duration-300"
                aria-label="밖으로 나가기"
              >
                <span
                  className="text-[13px] sm:text-[14px] tracking-[0.05em] text-[var(--paper)]"
                  style={{ fontFamily: 'var(--font-shadows)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                >
                  ← Go Outside
                </span>
              </button>

              {/* Subtle wall panel lines */}
              <svg className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]" width="100%" height="100%">
                <line x1="0" y1="35%" x2="100%" y2="35%" stroke="var(--paper)" strokeWidth="0.5" />
                <line x1="0" y1="70%" x2="100%" y2="70%" stroke="var(--paper)" strokeWidth="0.3" />
              </svg>

              {/* ── Photo booth screen silhouette (back wall) ── */}
              <div className="absolute top-[36px] left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center">
                {/* Screen frame */}
                <div className="relative w-[140px] sm:w-[180px] h-[105px] sm:h-[135px] rounded-[3px] border-[1.5px] border-[var(--paper)]/15 bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                  {/* Lens icon */}
                  <div className="w-[24px] h-[24px] rounded-full border-[1.2px] border-[var(--paper)]/20 flex items-center justify-center">
                    <div className="w-[10px] h-[10px] rounded-full border-[1px] border-[var(--paper)]/15" />
                  </div>
                  {/* Small red light */}
                  <div className="absolute top-2 right-3 w-[4px] h-[4px] rounded-full bg-[var(--crayon-red)] opacity-50" />
                </div>
                {/* Screen label */}
                <span
                  className="mt-2 text-[8px] tracking-[0.25em] text-[var(--paper)] opacity-20 uppercase"
                  style={{ fontFamily: 'var(--font-josefin)' }}
                >
                  camera
                </span>
              </div>

              {/* ── Vintage Tripod Stool ── */}
              <button
                onClick={handleSitDown}
                className="absolute bottom-[45px] sm:bottom-[55px] left-1/2 -translate-x-1/2 z-[5] flex flex-col items-center cursor-pointer group"
                aria-label="의자에 앉아 촬영 시작"
              >
                <svg className="w-[120px] sm:w-[150px] h-[120px] sm:h-[150px] transition-transform duration-300 group-hover:scale-105" viewBox="0 0 150 150">
                  <defs>
                    <linearGradient id="cushionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c8baa8" />
                      <stop offset="50%" stopColor="#b5a594" />
                      <stop offset="100%" stopColor="#a89884" />
                    </linearGradient>
                  </defs>

                  {/* Floor shadow — hatched ellipse */}
                  <ellipse cx="75" cy="142" rx="45" ry="5" fill="none" stroke="var(--pencil)" strokeWidth="0.5" opacity="0.10" />
                  {[40, 50, 60, 70, 80, 90, 100, 110].map((x, i) => (
                    <line key={i} x1={x} y1={x < 60 || x > 100 ? 140 : 139} x2={x + 3} y2="145" stroke="var(--pencil)" strokeWidth="0.5" opacity="0.06" />
                  ))}

                  {/* Left leg + wood grain */}
                  <line x1="50" y1="55" x2="30" y2="138" stroke="var(--pencil)" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
                  <line x1="48" y1="68" x2="35" y2="125" stroke="var(--pencil)" strokeWidth="0.4" opacity="0.12" />
                  <line x1="49" y1="62" x2="33" y2="128" stroke="var(--pencil)" strokeWidth="0.3" opacity="0.08" />

                  {/* Right leg + wood grain */}
                  <line x1="100" y1="55" x2="120" y2="138" stroke="var(--pencil)" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
                  <line x1="102" y1="68" x2="115" y2="125" stroke="var(--pencil)" strokeWidth="0.4" opacity="0.12" />
                  <line x1="101" y1="62" x2="117" y2="128" stroke="var(--pencil)" strokeWidth="0.3" opacity="0.08" />

                  {/* Back center leg + wood grain */}
                  <line x1="75" y1="55" x2="75" y2="137" stroke="var(--pencil)" strokeWidth="1.8" strokeLinecap="round" opacity="0.25" />
                  <line x1="76.5" y1="65" x2="76.5" y2="128" stroke="var(--pencil)" strokeWidth="0.3" opacity="0.08" />

                  {/* Cross brace — triangular support */}
                  <line x1="40" y1="98" x2="110" y2="98" stroke="var(--pencil)" strokeWidth="1.2" strokeLinecap="round" opacity="0.18" />
                  <line x1="40" y1="98" x2="75" y2="94" stroke="var(--pencil)" strokeWidth="0.8" strokeLinecap="round" opacity="0.12" />
                  <line x1="110" y1="98" x2="75" y2="94" stroke="var(--pencil)" strokeWidth="0.8" strokeLinecap="round" opacity="0.12" />

                  {/* Cushion — round seat */}
                  <ellipse cx="75" cy="48" rx="38" ry="14" fill="url(#cushionGrad)" stroke="var(--pencil)" strokeWidth="1.6" opacity="0.85" />
                  {/* Cushion side depth */}
                  <path d="M37 48 Q37 56, 75 58 Q113 56, 113 48" fill="none" stroke="var(--pencil)" strokeWidth="1" opacity="0.15" />

                  {/* X-stitch pattern on cushion */}
                  <line x1="55" y1="42" x2="65" y2="52" stroke="var(--pencil)" strokeWidth="0.8" opacity="0.15" />
                  <line x1="65" y1="42" x2="55" y2="52" stroke="var(--pencil)" strokeWidth="0.8" opacity="0.15" />
                  <line x1="69" y1="41" x2="79" y2="51" stroke="var(--pencil)" strokeWidth="0.8" opacity="0.15" />
                  <line x1="79" y1="41" x2="69" y2="51" stroke="var(--pencil)" strokeWidth="0.8" opacity="0.15" />
                  <line x1="83" y1="42" x2="93" y2="52" stroke="var(--pencil)" strokeWidth="0.8" opacity="0.15" />
                  <line x1="93" y1="42" x2="83" y2="52" stroke="var(--pencil)" strokeWidth="0.8" opacity="0.15" />

                  {/* Cushion highlight */}
                  <ellipse cx="68" cy="44" rx="12" ry="4" fill="white" opacity="0.06" />
                </svg>

                {/* Label */}
                <motion.span
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[13px] sm:text-[15px] tracking-[0.12em] text-[var(--paper)] uppercase"
                  style={{ fontFamily: 'var(--font-shadows)', marginTop: '-6px', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                >
                  SIT HERE TO START
                </motion.span>
              </button>

              {/* ── Floor ── */}
              <div className="absolute bottom-0 left-0 right-0 h-[40px] sm:h-[48px] z-[3]"
                style={{ background: 'linear-gradient(0deg, rgba(60,52,44,0.5) 0%, rgba(50,44,38,0.2) 70%, transparent 100%)' }}
              />

              {/* ── Side curtain remnants (left and right edges) ── */}
              <div className="absolute left-0 top-0 bottom-0 w-[18px] z-[4] curtain-stripes bg-[var(--paper)] opacity-60" />
              <div className="absolute right-0 top-0 bottom-0 w-[18px] z-[4] curtain-stripes bg-[var(--paper)] opacity-60" />
            </div>
          </motion.div>
        )}

        {/* ═══════════ STEP 3: Camera UI ═══════════ */}
        {viewStatus === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 1.15, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="flex w-full flex-col items-center"
          >

      {/* ← Back to Seat button */}
      <button
        onClick={handleBackToSeat}
        className="self-start mb-2 ml-4 flex items-center cursor-pointer opacity-35 hover:opacity-65 transition-opacity duration-300"
        aria-label="의자로 돌아가기"
      >
        <span
          className="text-[14px] sm:text-[15px] tracking-[0.05em] text-[var(--charcoal)]"
          style={{ fontFamily: 'var(--font-shadows)', textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
        >
          ← Back to Seat
        </span>
      </button>

      {/* Title — clean sans-serif */}
      <h1
        className="mb-8 text-[24px] font-light tracking-[0.5em] text-[var(--charcoal)] sm:text-[30px] uppercase"
        style={{ fontFamily: "var(--font-josefin)" }}
      >
        Polaroid Booth
      </h1>

      {/* Main Content */}
      <div className="flex w-full max-w-[880px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* ═══ Left: Viewfinder → Camera Body → Controls ═══ */}
        <div className="flex w-full flex-1 flex-col items-center gap-3">
          {/* Viewfinder with live webcam */}
          <Viewfinder
            videoRef={videoRef}
            activeFilter={activeFilter}
            warmCool={warmCool}
            webcamReady={webcamReady}
            webcamError={webcamError}
            onRetry={retry}
          />

          {/* ── Camera Body ── */}
          <div
            className="camera-sketch relative w-full max-w-[400px]"
            style={{ zIndex: 1 }}
          >
            {/* Doodle scribble lines around camera */}
            <div className="doodle-lines" />

            {/* Camera body — dark brown colored-pencil fill */}
            <div
              className={`camera-body-fill pencil-double-rect relative rounded-[14px] px-5 py-4 pb-8 ${jiggling ? "animate-sketch-jiggle" : ""}`}
            >
              {/* Crayon hatching texture */}
              <div className="crayon-texture" />
              {/* Grain overlay */}
              <div className="grain-overlay" />

              {/* Top bar — flash, brand, counter */}
              <div className="relative z-10 mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="pencil-double-thin h-3 w-3 rounded-full border border-[#c4b4a0]/30" />
                  <div className="h-[1px] w-3 bg-[#c4b4a0] opacity-30" />
                  <div className="h-[1px] w-1.5 bg-[#c4b4a0] opacity-25" />
                </div>
                <span
                  className="text-[8px] font-light uppercase tracking-[0.3em] text-[#ddd0c0] opacity-60"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  Polaroid
                </span>
                {/* Counter */}
                <div className="pencil-double-thin flex h-4 w-8 items-center justify-center rounded-[2px] border border-[#c4b4a0]/20 font-mono text-[8px] tracking-wide text-[#ddd0c0] opacity-70">
                  {capturedCount}/{MAX_SHOTS}
                </div>
              </div>

              {/* Lens — centered, clearly visible on dark body */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="relative">
                  <div
                    className="lens-glow pointer-events-none absolute -inset-3 rounded-full"
                    style={{
                      background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
                    }}
                  />
                  {/* Outer lens ring */}
                  <div className="pencil-double-thin relative flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[rgba(30,24,18,0.5)] shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]">
                    {/* Inner lens ring */}
                    <div className="pencil-double-thin relative h-[40px] w-[40px] overflow-hidden rounded-full bg-[rgba(20,16,12,0.6)] shadow-[inset_0_0_6px_rgba(0,0,0,0.4)]">
                      {/* Iris hint — pencil hatching */}
                      <div className="absolute inset-[5px] rounded-full opacity-[0.25]" style={{
                        background: "repeating-conic-gradient(#a09080 0deg, transparent 8deg, transparent 20deg)",
                      }} />
                      {/* Glass highlight */}
                      <div className="absolute left-[9px] top-[7px] h-[5px] w-[5px] rounded-full bg-white opacity-[0.25]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ejection slot — pencil line */}
              <div
                className="relative mt-4 flex justify-center"
                style={{ overflow: "visible", zIndex: 60 }}
              >
                <div
                  className="h-[1.5px] w-[55%] bg-[#c4b4a0] opacity-35"
                  style={{ filter: "url(#pencil-wobble)" }}
                />

                {/* Ejecting polaroid with actual captured image */}
                {ejecting && (
                  <div className="animate-polaroid-eject absolute bottom-0 w-[45%]">
                    <div
                      className="polaroid-frame rounded-[3px] bg-[var(--paper)] p-1 pb-4"
                      style={{
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1px]">
                        {ejectingImage ? (
                          <>
                            <img
                              src={ejectingImage}
                              alt=""
                              className="animate-photo-develop h-full w-full object-cover"
                            />
                            <div className="film-grain pointer-events-none absolute inset-0" />
                          </>
                        ) : (
                          <div className="h-full w-full bg-zinc-200/30" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Shutter Track — oval slide-to-shoot bar ── */}
          <div className="relative mx-auto w-full max-w-[320px] py-1">
            <button
              onClick={handleCapture}
              disabled={allDone || ejecting || !webcamReady}
              className="shutter-track group relative flex h-[38px] w-full cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="촬영하기"
            >
              {/* Track label */}
              <span
                className="relative z-10 select-none text-[11px] font-light tracking-[0.18em] text-[var(--pencil)] opacity-35 transition-opacity group-hover:opacity-55"
                style={{ fontFamily: "var(--font-josefin)" }}
              >
                Press the Red Button
              </span>
              {/* Red dot indicator — left side */}
              <span className="absolute left-3 top-1/2 z-10 h-[10px] w-[10px] -translate-y-1/2 rounded-full bg-[var(--crayon-red)] opacity-70 transition-transform group-hover:scale-125" />
            </button>
          </div>

          {/* Filter controls */}
          <FilterSelector
            activeFilter={activeFilter}
            warmCool={warmCool}
            onFilterChange={setActiveFilter}
            onWarmCoolChange={setWarmCool}
          />
        </div>

        {/* ═══ Right: Polaroid Gallery ═══ */}
        <div className="flex w-full flex-col items-center lg:w-[180px] lg:shrink-0 lg:pt-2">
          <PhotoStrip
            shots={shots}
            onSave={handleSaveStrip}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* Bottom pencil guideline */}
      <svg
        className="pointer-events-none fixed bottom-0 left-0 h-3 w-full"
        preserveAspectRatio="none"
        style={{ opacity: 0.08 }}
      >
        <line x1="0" y1="1.5" x2="100%" y2="2" stroke="var(--pencil)" strokeWidth="0.8" strokeDasharray="10 6 3 6" strokeLinecap="round" filter="url(#pencil-wobble)" />
      </svg>

      {/* Side margin guides — faint vertical pencil lines */}
      <svg className="pointer-events-none fixed inset-y-0 left-8 w-[1px]" style={{ opacity: 0.04 }}>
        <line x1="0" y1="0" x2="0" y2="100%" stroke="var(--pencil)" strokeWidth="1" strokeDasharray="6 12" filter="url(#pencil-wobble)" />
      </svg>
      <svg className="pointer-events-none fixed inset-y-0 right-8 w-[1px]" style={{ opacity: 0.04 }}>
        <line x1="0" y1="0" x2="0" y2="100%" stroke="var(--pencil)" strokeWidth="1" strokeDasharray="6 12" filter="url(#pencil-wobble)" />
      </svg>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

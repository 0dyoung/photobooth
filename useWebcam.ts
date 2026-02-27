"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export function useWebcam(enabled: boolean = true) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    // Stop any existing stream first
    clearRetry();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저에서는 카메라를 지원하지 않습니다");
      return;
    }

    try {
      setError(null);
      setIsReady(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Try to connect stream to video element
      // If element isn't in DOM yet (AnimatePresence delay), poll until it appears
      const connectStream = () => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
          // In case metadata already loaded
          if (videoRef.current.readyState >= 1) {
            setIsReady(true);
          }
          return true;
        }
        return false;
      };

      if (!connectStream()) {
        // Video element not yet in DOM — poll every 100ms
        retryTimerRef.current = setInterval(() => {
          if (connectStream()) {
            clearRetry();
          }
        }, 100);
        // Safety: stop polling after 15s
        setTimeout(() => clearRetry(), 15000);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "카메라 접근이 거부되었습니다";
      setError(msg);
      setIsReady(false);
    }
  }, [clearRetry]);

  const stop = useCallback(() => {
    clearRetry();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, [clearRetry]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  return { videoRef, isReady, error, retry: start };
}

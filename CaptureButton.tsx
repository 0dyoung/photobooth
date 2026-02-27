"use client";

interface CaptureButtonProps {
  onCapture?: () => void;
  disabled?: boolean;
}

export default function CaptureButton({
  onCapture,
  disabled,
}: CaptureButtonProps) {
  return (
    <button
      onClick={onCapture}
      disabled={disabled}
      className="crayon-red-btn group relative flex h-[26px] w-[26px] items-center justify-center"
      aria-label="촬영하기"
    >
      {/* Subtle ring pulse when active */}
      {!disabled && (
        <span
          className="absolute inset-[-3px] animate-ping rounded-full bg-[var(--crayon-red)]/15"
          style={{ animationDuration: "2.5s", borderRadius: "50%" }}
        />
      )}
    </button>
  );
}

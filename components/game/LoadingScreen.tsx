"use client";

export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ground">
      <div className="space-y-5 text-center">
        <div className="relative mx-auto h-14 w-14">
          <div className="absolute inset-0 rounded-full border border-signal/25" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-signal" />
        </div>
        <p className="hud-label animate-pulse">Initializing globe</p>
      </div>
    </div>
  );
}

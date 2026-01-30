"use client";

export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          {/* Spinning globe icon */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald/30" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald animate-spin" />
        </div>
        <p className="text-white/60 text-sm animate-pulse">Loading globe...</p>
      </div>
    </div>
  );
}

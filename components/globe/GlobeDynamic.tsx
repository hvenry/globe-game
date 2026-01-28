"use client";

import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <span className="text-white/20 animate-pulse text-lg">
        Loading globe...
      </span>
    </div>
  ),
});

export default Globe;

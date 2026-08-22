"use client";

import type { Resolution } from "@/lib/engine/types";

export function countResolutions(resolvedCountries: Record<string, Resolution>) {
  let perfect = 0;
  let almost = 0;
  let failed = 0;
  for (const res of Object.values(resolvedCountries)) {
    if (res === "perfect") perfect++;
    else if (res === "almost") almost++;
    else failed++;
  }
  return { perfect, almost, failed };
}

interface ScoreCardProps {
  perfect: number;
  almost: number;
  failed: number;
}

/** Perfect / almost / failed breakdown readout. */
export default function ScoreCard({ perfect, almost, failed }: ScoreCardProps) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-control border border-hairline bg-hairline">
      <div className="bg-well p-2 md:p-2.5">
        <p className="hud-label text-success/70">Perfect</p>
        <p className="readout mt-0.5 text-base font-medium md:mt-1 md:text-lg text-success">{perfect}</p>
      </div>
      <div className="bg-well p-2 md:p-2.5">
        <p className="hud-label text-caution/70">Almost</p>
        <p className="readout mt-0.5 text-base font-medium md:mt-1 md:text-lg text-caution">{almost}</p>
      </div>
      <div className="bg-well p-2 md:p-2.5">
        <p className="hud-label text-alert/70">Failed</p>
        <p className="readout mt-0.5 text-base font-medium md:mt-1 md:text-lg text-alert">{failed}</p>
      </div>
    </div>
  );
}

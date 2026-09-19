"use client";

import { ChevronLeftIcon } from "@/components/ui/icons";

/**
 * The header of a panel one rung in: a back affordance on the left and a
 * centred title. The empty box on the right balances the button so the title
 * sits on the panel's centre line rather than the remaining space's.
 */
export default function PanelHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack} aria-label="Back" className="btn-icon press">
        <ChevronLeftIcon size={13} />
      </button>
      <h2 className="hud-label text-mid">{title}</h2>
      <div className="h-7 w-7" />
    </div>
  );
}

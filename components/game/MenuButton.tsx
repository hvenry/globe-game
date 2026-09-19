"use client";

interface MenuButtonProps {
  onClick: () => void;
}

/** Presentational: when it belongs on screen is the caller's business, since
 *  solo and race decide that from different state. */
export default function MenuButton({ onClick }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Menu"
      className="hud-card hud-top press group absolute left-4 z-10 cursor-pointer transition-all md:left-6"
    >
      <div className="hud-card-row flex-col justify-center gap-[5px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-px w-5 bg-mid transition-colors group-hover:bg-hi"
          />
        ))}
      </div>
    </button>
  );
}

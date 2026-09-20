"use client";

/**
 * The country set picker in its own, wider panel: three columns on desktop
 * so continents, regions, quick play and rankings can be read at a glance.
 * Reached from the menu's Country set tile and from the settings page.
 */

import { useSettingsStore } from "@/lib/store/settings-store";
import PanelHeader from "@/components/ui/PanelHeader";
import ScrollColumn from "@/components/ui/ScrollColumn";
import { CountrySetSelect } from "../settings/SettingsControls";

export default function CountrySetView({
  onBack,
  expertMode,
}: {
  onBack: () => void;
  expertMode: boolean;
}) {
  const countrySet = useSettingsStore((s) => s.countrySet);
  const setCountrySet = useSettingsStore((s) => s.setCountrySet);

  return (
    <ScrollColumn
      header={<PanelHeader title="Country set" onBack={onBack} />}
      accent={expertMode ? "expert" : "signal"}
    >
      <CountrySetSelect
        value={countrySet}
        onChange={setCountrySet}
        expertMode={expertMode}
        columns={3}
      />
    </ScrollColumn>
  );
}

import { Suspense } from "react";
import RaceRoute from "@/components/race/RaceRoute";

export const metadata = {
  title: "Live race — globe.expert",
  description: "Race a friend to find every country first.",
};

export default function RacePage() {
  return (
    <Suspense fallback={<div className="h-dvh w-screen bg-ground" />}>
      <RaceRoute />
    </Suspense>
  );
}

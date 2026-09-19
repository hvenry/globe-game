"use client";

import {
  ArrowLeftIcon as PhosphorArrowLeft,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon as PhosphorCheck,
  ExportIcon,
  MoonIcon as PhosphorMoon,
  SlidersHorizontalIcon,
  SunIcon as PhosphorSun,
  UsersIcon as PhosphorUsers,
  type IconProps as PhosphorIconProps,
} from "@phosphor-icons/react";

/**
 * Icon set: Phosphor (https://phosphoricons.com), mapped through this module
 * so every glyph ships with the house defaults (16px, regular weight) and can
 * be swapped or re-weighted in one place. Import icons from here, not from
 * @phosphor-icons/react directly.
 */

export interface IconProps extends PhosphorIconProps {
  size?: number;
}

const DEFAULTS = { size: 16, weight: "regular" } as const satisfies PhosphorIconProps;

export function ChevronLeftIcon(props: IconProps) {
  return <CaretLeftIcon {...DEFAULTS} {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <CaretRightIcon {...DEFAULTS} {...props} />;
}

export function ChevronDownIcon(props: IconProps) {
  return <CaretDownIcon {...DEFAULTS} {...props} />;
}

export function ArrowLeftIcon(props: IconProps) {
  return <PhosphorArrowLeft {...DEFAULTS} {...props} />;
}

/** Two people — multiplayer / live race */
export function UsersIcon(props: IconProps) {
  return <PhosphorUsers {...DEFAULTS} {...props} />;
}

/** Sliders — settings/tuning */
export function SlidersIcon(props: IconProps) {
  return <SlidersHorizontalIcon {...DEFAULTS} {...props} />;
}

/** Arrow-out-of-box share glyph */
export function ShareIcon(props: IconProps) {
  return <ExportIcon {...DEFAULTS} {...props} />;
}

export function CheckIcon(props: IconProps) {
  return <PhosphorCheck {...DEFAULTS} {...props} />;
}

/** Light theme indicator */
export function SunIcon(props: IconProps) {
  return <PhosphorSun {...DEFAULTS} {...props} />;
}

/** Dark theme indicator */
export function MoonIcon(props: IconProps) {
  return <PhosphorMoon {...DEFAULTS} {...props} />;
}

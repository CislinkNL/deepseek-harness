// Dogfight Signature Strike Logo for DeepSeek Harness (DSH)

import type { IconProps } from './icons/props.ts'

/**
 * Render the Dogfight Strike anchor logo.
 * @param props.size - width/height in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg.
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="54" fill="none" stroke="#EE0023" strokeOpacity="0.4" strokeWidth="4" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="#EE0023" strokeWidth="6" />
      <circle cx="60" cy="60" r="14" fill="#EE0023" />
    </svg>
  )
}

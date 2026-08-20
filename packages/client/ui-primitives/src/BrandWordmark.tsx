// Dogfight TOREN Brand Wordmark for DeepSeek Harness (DSH)

import type { IconProps } from './icons/props.ts'

/**
 * Render the TOREN brand wordmark with Dogfight visual aesthetics.
 * @param props.size - height in px (default 24; width keeps the 182:24 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the wordmark svg.
 */
export function BrandWordmark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={(size * 182) / 24}
      height={size}
      className={className}
      viewBox="0 0 182 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Dogfight Strike Anchor Icon */}
      <g transform="translate(1, 2) scale(0.1666)">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#EE0023" strokeOpacity="0.45" strokeWidth="5" />
        <circle cx="60" cy="60" r="30" fill="none" stroke="#EE0023" strokeWidth="7" />
        <circle cx="60" cy="60" r="13" fill="#EE0023" />
      </g>

      {/* TOREN Wordmark in General Sans font with red strike period */}
      <text
        x="28"
        y="17.5"
        fill="currentColor"
        fontFamily="General Sans, -apple-system, sans-serif"
        fontSize="17"
        fontWeight="700"
        letterSpacing="-0.035em"
      >
        TOREN<tspan fill="#EE0023">.</tspan>
      </text>
    </svg>
  )
}

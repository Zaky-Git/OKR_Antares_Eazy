/**
 * Returns the input hex color if it matches the 7-character hex pattern,
 * otherwise returns the fallback color #E5E7EB.
 *
 * Used by ObjectiveCard, ContextBadges, and other components that render
 * master data colors which may be invalid, null, or from orphaned references.
 */
export const FALLBACK_COLOR = '#E5E7EB';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function getBadgeColor(hex: string | null | undefined): string {
  if (typeof hex !== 'string') return FALLBACK_COLOR;
  return HEX_PATTERN.test(hex) ? hex : FALLBACK_COLOR;
}

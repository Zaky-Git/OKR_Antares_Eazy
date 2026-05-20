import { getBadgeColor } from '../../utils/getBadgeColor';

interface ColorSwatchProps {
  color: string | null | undefined;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Pure UI component to display a color swatch with optional border.
 * Falls back to gray (#E5E7EB) if color is invalid or null.
 */
export function ColorSwatch({ color, size = 16, className = '', title }: ColorSwatchProps) {
  const safeColor = getBadgeColor(color);
  return (
    <span
      className={`inline-block rounded-full border border-gray-200 align-middle ${className}`}
      style={{ width: size, height: size, backgroundColor: safeColor }}
      title={title || color || undefined}
    />
  );
}

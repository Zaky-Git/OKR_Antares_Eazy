import { useEffect, useState } from 'react';

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Color picker atomic — combines native <input type="color"> with text hex input.
 * Validates against #RRGGBB pattern; shows inline error if invalid.
 */
export function ColorPicker({ label, value, onChange, error, disabled }: ColorPickerProps) {
  const [localText, setLocalText] = useState(value || '#194FBC');

  useEffect(() => {
    if (value) setLocalText(value);
  }, [value]);

  const isValid = HEX_PATTERN.test(localText);
  const previewColor = isValid ? localText : '#E5E7EB';

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-2">
        <span
          className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: previewColor }}
          title={isValid ? localText : 'Invalid color, fallback shown'}
        />
        <input
          type="color"
          value={isValid ? localText : '#194FBC'}
          disabled={disabled}
          onChange={(e) => {
            setLocalText(e.target.value.toUpperCase());
            onChange(e.target.value.toUpperCase());
          }}
          className="w-9 h-9 cursor-pointer border border-gray-200 rounded-lg disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={localText}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setLocalText(v);
            if (HEX_PATTERN.test(v)) {
              onChange(v.toUpperCase());
            }
          }}
          placeholder="#194FBC"
          maxLength={7}
          className={`flex-1 px-3 py-2 border rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 ${
            isValid ? 'border-gray-200 focus:border-primary focus:ring-primary/10' : 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
          } disabled:bg-gray-50`}
        />
      </div>
      {error && <span className="text-xs text-red-500 mt-1.5 block">{error}</span>}
      {!error && !isValid && (
        <span className="text-xs text-amber-600 mt-1.5 block">Format harus #RRGGBB</span>
      )}
    </div>
  );
}

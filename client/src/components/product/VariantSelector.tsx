import { Check } from 'lucide-react';
import type { ProductVariants } from '../../types';

interface VariantSelectorProps {
  variants: ProductVariants;
  selectedSize: string;
  selectedColor: string;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
}

export default function VariantSelector({
  variants,
  selectedSize,
  selectedColor,
  onSizeChange,
  onColorChange,
}: VariantSelectorProps) {
  const { sizes, colors } = variants;

  return (
    <div className="space-y-5">
      {/* Size Selector */}
      {sizes && sizes.length > 0 && sizes[0] !== 'One Size' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-txt-secondary">Size</span>
            {selectedSize && (
              <span className="text-xs text-txt-tertiary">{selectedSize}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                className={`min-w-[3rem] px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedSize === size
                    ? 'bg-gold text-white shadow-lg shadow-gold/25'
                    : 'bg-bg-tertiary text-txt-secondary border border-bdr-subtle hover:border-gold/50 hover:text-txt-primary'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {colors && colors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-txt-secondary">Color</span>
            {selectedColor && (
              <span className="text-xs text-txt-tertiary">{selectedColor}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const isSelected = selectedColor === color.name;
              const isLight = isLightColor(color.hex);
              return (
                <button
                  key={color.name}
                  onClick={() => onColorChange(color.name)}
                  className={`group relative w-10 h-10 rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-gold ring-offset-2 ring-offset-bg-primary scale-110'
                      : 'hover:scale-110 hover:ring-2 hover:ring-bdr hover:ring-offset-2 hover:ring-offset-bg-primary'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  aria-label={`Select ${color.name}`}
                >
                  {isSelected && (
                    <Check
                      className={`absolute inset-0 m-auto w-4 h-4 ${
                        isLight ? 'text-gray-800' : 'text-white'
                      }`}
                      strokeWidth={3}
                    />
                  )}
                  {/* Border for light colors */}
                  {isLight && (
                    <span className="absolute inset-0 rounded-full border border-bdr-subtle" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) > 186;
}

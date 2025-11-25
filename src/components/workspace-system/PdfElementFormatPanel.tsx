import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { X } from 'lucide-react';
import { BaseElement } from '../element-look-and-feel/types';

interface PdfElement extends BaseElement {
  type: 'pdf';
  backgroundColor?: string;
}

interface PdfElementFormatPanelProps {
  element: PdfElement;
  onUpdate: (updates: Partial<PdfElement>) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const PRESET_COLORS = [
  '#000000', '#6B7280', '#EF4444', '#F59E0B',
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
];

const PRESET_FILL_COLORS = [
  '#FFFFFF', '#F3F4F6', '#FEE2E2', '#FEF3C7',
  '#D1FAE5', '#DBEAFE', '#EDE9FE', '#FCE7F3', 'transparent'
];

export function PdfElementFormatPanel({ element, onUpdate, onClose, onDelete }: PdfElementFormatPanelProps) {
  const initialBorderWidth = element.borderWidth ?? 2;
  const [borderEnabled, setBorderEnabled] = useState(initialBorderWidth > 0 && element.borderColor !== 'transparent');
  const [borderColor, setBorderColor] = useState(
    element.borderColor === 'transparent' ? '#000000' : (element.borderColor || '#000000')
  );
  const [borderWidth, setBorderWidth] = useState(initialBorderWidth > 0 ? initialBorderWidth : 2);

  const [backgroundColor, setBackgroundColor] = useState(element.backgroundColor || 'transparent');
  const [customBorderColor, setCustomBorderColor] = useState(borderColor);
  const [customBackgroundColor, setCustomBackgroundColor] = useState(backgroundColor);

  const handleBorderEnabledChange = (checked: boolean) => {
    setBorderEnabled(checked);
    // If enabling border and width is 0, set to default
    if (checked && borderWidth === 0) {
      setBorderWidth(2);
    }
  };

  const handleApply = () => {
    onUpdate({
      borderColor: borderEnabled ? borderColor : 'transparent',
      borderWidth: borderEnabled ? (borderWidth || 2) : 0,
      backgroundColor
    });
    onClose();
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    setCustomBorderColor(color);
  };

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
    setCustomBackgroundColor(color);
  };

  return (
    <div
      className="fixed top-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-[90vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold">Format PDF</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Background Color Section */}
        <div className="space-y-3">
          <Label>Background Color</Label>
          <div className="grid grid-cols-9 gap-2">
            {PRESET_FILL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleBackgroundColorChange(color)}
                className="w-8 h-8 rounded border-2 transition-all hover:scale-110 relative"
                style={{
                  backgroundColor: color === 'transparent' ? '#FFFFFF' : color,
                  borderColor: backgroundColor === color ? '#3B82F6' : '#D1D5DB'
                }}
              >
                {color === 'transparent' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-0.5 bg-red-500 rotate-45" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center mt-2">
            <Input
              type="color"
              value={customBackgroundColor === 'transparent' ? '#FFFFFF' : customBackgroundColor}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="w-16 h-8 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={backgroundColor}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="flex-1 h-8"
              placeholder="transparent"
            />
          </div>
        </div>

        {/* Border Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="border-enabled"
              checked={borderEnabled}
              onCheckedChange={(checked) => handleBorderEnabledChange(checked as boolean)}
            />
            <Label htmlFor="border-enabled" className="cursor-pointer">
              Enable Border
            </Label>
          </div>

          {borderEnabled && (
            <>
              <div className="space-y-2">
                <Label>Border Color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleBorderColorChange(color)}
                      className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: borderColor === color ? '#3B82F6' : '#D1D5DB'
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 items-center mt-2">
                  <Input
                    type="color"
                    value={customBorderColor}
                    onChange={(e) => handleBorderColorChange(e.target.value)}
                    className="w-16 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={borderColor}
                    onChange={(e) => handleBorderColorChange(e.target.value)}
                    className="flex-1 h-8"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Border Width</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center">{borderWidth}px</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 4, 6].map((width) => (
                    <Button
                      key={width}
                      onClick={() => setBorderWidth(width)}
                      variant={borderWidth === width ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                    >
                      {width}px
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Apply Button */}
        <Button onClick={handleApply} className="w-full">
          Apply
        </Button>

        {/* Delete Button */}
        {onDelete && (
          <Button onClick={onDelete} variant="destructive" className="w-full">
            Delete PDF
          </Button>
        )}
      </div>
    </div>
  );
}

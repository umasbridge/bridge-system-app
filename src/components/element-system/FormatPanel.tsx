import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';
import { BaseElement } from './types';

interface FormatPanelProps {
  element: BaseElement;
  onUpdate: (updates: Partial<BaseElement>) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#000000', '#6B7280', '#EF4444', '#F59E0B', 
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
];

export function FormatPanel({ element, onUpdate, onClose }: FormatPanelProps) {
  const [borderColor, setBorderColor] = useState(element.borderColor || '#000000');
  const [borderWidth, setBorderWidth] = useState(element.borderWidth ?? 2);
  const [fillColor, setFillColor] = useState(element.fillColor || '#FFFFFF');
  const [customBorderColor, setCustomBorderColor] = useState(borderColor);
  const [customFillColor, setCustomFillColor] = useState(fillColor);

  const handleApply = () => {
    onUpdate({
      borderColor: borderWidth === 0 ? 'transparent' : borderColor,
      borderWidth,
      fillColor
    });
    onClose();
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    setCustomBorderColor(color);
  };

  const handleFillColorChange = (color: string) => {
    setFillColor(color);
    setCustomFillColor(color);
  };

  return (
    <div className="fixed top-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold">Format Element</h3>
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
        {/* Border Color */}
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

        {/* Border Width */}
        <div className="space-y-2">
          <Label>Border Width</Label>
          <div className="flex gap-2 mb-2">
            <Button
              onClick={() => setBorderWidth(0)}
              variant={borderWidth === 0 ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              No Border
            </Button>
          </div>
          {borderWidth > 0 && (
            <>
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
            </>
          )}
        </div>

        {/* Fill Color */}
        <div className="space-y-2">
          <Label>Fill Color</Label>
          <div className="flex gap-2 mb-2">
            <Button
              onClick={() => handleFillColorChange('transparent')}
              variant={fillColor === 'transparent' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              No Fill
            </Button>
          </div>
          {fillColor !== 'transparent' && (
            <>
              <div className="grid grid-cols-9 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleFillColorChange(color)}
                    className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: fillColor === color ? '#3B82F6' : '#D1D5DB'
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center mt-2">
                <Input
                  type="color"
                  value={customFillColor === 'transparent' ? '#FFFFFF' : customFillColor}
                  onChange={(e) => handleFillColorChange(e.target.value)}
                  className="w-16 h-8 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={fillColor}
                  onChange={(e) => handleFillColorChange(e.target.value)}
                  className="flex-1 h-8"
                  placeholder="#FFFFFF"
                />
              </div>
            </>
          )}
        </div>

        {/* Apply Button */}
        <Button onClick={handleApply} className="w-full">
          Apply
        </Button>
      </div>
    </div>
  );
}

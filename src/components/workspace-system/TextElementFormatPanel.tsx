import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { X, Trash2 } from 'lucide-react';
import { TextElement } from './TextElement';

interface TextElementFormatPanelProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
  onDelete?: () => void;
}

const PRESET_COLORS = [
  '#000000', '#6B7280', '#EF4444', '#F59E0B', 
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
];

export function TextElementFormatPanel({ element, onUpdate, onDelete }: TextElementFormatPanelProps) {
  const initialBorderWidth = element.borderWidth ?? 0;
  const [borderEnabled, setBorderEnabled] = useState(initialBorderWidth > 0);
  const [borderColor, setBorderColor] = useState(
    element.borderColor === 'transparent' ? '#000000' : (element.borderColor || '#000000')
  );
  const [borderWidth, setBorderWidth] = useState(initialBorderWidth > 0 ? initialBorderWidth : 2);
  const [fillEnabled, setFillEnabled] = useState(element.fillColor !== 'transparent' && element.fillColor !== undefined);
  const [fillColor, setFillColor] = useState(element.fillColor === 'transparent' || !element.fillColor ? '#FFFFFF' : element.fillColor);
  const [customBorderColor, setCustomBorderColor] = useState(borderColor);
  const [customFillColor, setCustomFillColor] = useState(fillColor);

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
      fillColor: fillEnabled ? fillColor : 'transparent'
    });
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    setCustomBorderColor(color);
  };

  const handleFillColorChange = (color: string) => {
    setFillColor(color);
    setCustomFillColor(color);
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <div className="fixed top-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold">Format Text Element</h3>
        <Button
          onClick={handleApply}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto">
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

        {/* Fill Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="fill-enabled"
              checked={fillEnabled}
              onCheckedChange={(checked) => setFillEnabled(checked as boolean)}
            />
            <Label htmlFor="fill-enabled" className="cursor-pointer">
              Enable Fill
            </Label>
          </div>

          {fillEnabled && (
            <div className="space-y-2">
              <Label>Fill Color</Label>
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
                  value={customFillColor}
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
            </div>
          )}
        </div>

        {/* Apply Button */}
        <Button onClick={handleApply} className="w-full">
          Apply
        </Button>

        {/* Delete Button */}
        {onDelete && (
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="w-full mt-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
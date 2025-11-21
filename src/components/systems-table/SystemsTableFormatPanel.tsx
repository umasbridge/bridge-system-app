import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { X } from 'lucide-react';
import { BaseElement } from '../element-look-and-feel/types';

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
}

export interface SystemsTableElement extends BaseElement {
  gridlines?: GridlineOptions;
}

interface SystemsTableFormatPanelProps {
  element: SystemsTableElement;
  onUpdate: (updates: Partial<SystemsTableElement>) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#000000', '#6B7280', '#EF4444', '#F59E0B', 
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
];

export function SystemsTableFormatPanel({ element, onUpdate, onClose }: SystemsTableFormatPanelProps) {
  const initialBorderWidth = element.borderWidth ?? 2;
  const [borderEnabled, setBorderEnabled] = useState(initialBorderWidth > 0);
  const [borderColor, setBorderColor] = useState(
    element.borderColor === 'transparent' ? '#000000' : (element.borderColor || '#000000')
  );
  const [borderWidth, setBorderWidth] = useState(initialBorderWidth > 0 ? initialBorderWidth : 2);
  
  // Gridline settings
  const initialGridlines = element.gridlines || { enabled: false, color: '#D1D5DB', width: 1 };
  const [gridlinesEnabled, setGridlinesEnabled] = useState(initialGridlines.enabled);
  const [gridlineColor, setGridlineColor] = useState(initialGridlines.color);
  const [gridlineWidth, setGridlineWidth] = useState(initialGridlines.width);
  
  const [customBorderColor, setCustomBorderColor] = useState(borderColor);
  const [customGridlineColor, setCustomGridlineColor] = useState(gridlineColor);

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
      gridlines: {
        enabled: gridlinesEnabled,
        color: gridlineColor,
        width: gridlineWidth
      }
    });
    onClose();
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    setCustomBorderColor(color);
  };

  const handleGridlineColorChange = (color: string) => {
    setGridlineColor(color);
    setCustomGridlineColor(color);
  };

  return (
    <div className="fixed top-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold">Format Table</h3>
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

        {/* Gridlines Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="gridlines-enabled"
              checked={gridlinesEnabled}
              onCheckedChange={(checked) => setGridlinesEnabled(checked as boolean)}
            />
            <Label htmlFor="gridlines-enabled" className="cursor-pointer">
              Enable Gridlines
            </Label>
          </div>

          {gridlinesEnabled && (
            <>
              <div className="space-y-2">
                <Label>Gridline Color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleGridlineColorChange(color)}
                      className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: gridlineColor === color ? '#3B82F6' : '#D1D5DB'
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 items-center mt-2">
                  <Input
                    type="color"
                    value={customGridlineColor}
                    onChange={(e) => handleGridlineColorChange(e.target.value)}
                    className="w-16 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={gridlineColor}
                    onChange={(e) => handleGridlineColorChange(e.target.value)}
                    className="flex-1 h-8"
                    placeholder="#D1D5DB"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gridline Width</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={gridlineWidth}
                    onChange={(e) => setGridlineWidth(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center">{gridlineWidth}px</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((width) => (
                    <Button
                      key={width}
                      onClick={() => setGridlineWidth(width)}
                      variant={gridlineWidth === width ? 'default' : 'outline'}
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
      </div>
    </div>
  );
}

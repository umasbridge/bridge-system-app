import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { ImageElement as ImageElementType } from './types';

interface ImageElementProps {
  element: ImageElementType;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageElementType>) => void;
  onDelete: () => void;
  onFormat: () => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}

export function ImageElement({ 
  element, 
  isSelected, 
  containerRef,
  onSelect, 
  onUpdate, 
  onDelete,
  onFormat,
  onInteractionStart,
  onInteractionEnd
}: ImageElementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const width = Math.min(400, img.width);
          const height = width / aspectRatio;
          onUpdate({ 
            src: event.target?.result as string,
            width,
            height,
            size: { width, height }
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const aspectRatio = img.width / img.height;
              const width = Math.min(400, img.width);
              const height = width / aspectRatio;
              onUpdate({ 
                src: event.target?.result as string,
                width,
                height,
                size: { width, height }
              });
            };
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const hasBorder = element.borderWidth && element.borderWidth > 0 && element.borderColor !== 'transparent';
  const borderStyle = hasBorder
    ? `${element.borderWidth}px solid ${element.borderColor}`
    : 'none';

  const backgroundColor = element.fillColor !== 'transparent' 
    ? element.fillColor 
    : 'transparent';

  return (
    <ResizableElement
      element={element}
      isSelected={isSelected}
      containerRef={containerRef}
      actions={{
        onSelect,
        onUpdate,
        onDelete,
        onFormat,
        onInteractionStart,
        onInteractionEnd
      }}
    >
      <div className="w-full h-full">
        {!element.src ? (
          // Empty placeholder - direct rendering
          <div
            tabIndex={0}
            onPaste={handlePaste}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full h-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              border: hasBorder ? borderStyle : '2px dashed #d1d5db',
              backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : '#f9fafb'
            }}
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 text-center px-4">
              Click to upload or paste (Cmd/Ctrl+V)
            </p>
          </div>
        ) : (
          // Image - direct rendering with formatting
          <img
            src={element.src}
            alt="Content"
            className="w-full h-full object-cover"
            style={{
              border: borderStyle,
              backgroundColor
            }}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </ResizableElement>
  );
}

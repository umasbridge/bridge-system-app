import { useRef, useState } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);

  const loadImage = (file: File) => {
    if (file.type.startsWith('image/')) {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          loadImage(file);
        }
        break;
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        loadImage(file);
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
          // Empty placeholder with upload, paste, and drag-drop support
          <div
            tabIndex={0}
            onPaste={handlePaste}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
            style={{
              border: hasBorder ? borderStyle : isDragging ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
              backgroundColor: backgroundColor !== 'transparent' 
                ? backgroundColor 
                : isDragging ? '#eff6ff' : '#f9fafb'
            }}
          >
            <Upload className={`h-8 w-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className={`text-sm text-center px-4 mb-3 ${isDragging ? 'text-blue-600' : 'text-gray-500'}`}>
              {isDragging ? 'Drop image here' : 'Paste (Cmd/Ctrl+V) or drag image here'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              Upload Image
            </button>
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

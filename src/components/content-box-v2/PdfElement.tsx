import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { PdfElement as PdfElementType } from './types';

interface PdfElementProps {
  element: PdfElementType;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onUpdate: (updates: Partial<PdfElementType>) => void;
  onDelete: () => void;
  onFormat: () => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}

export function PdfElement({ 
  element, 
  isSelected, 
  containerRef,
  onSelect, 
  onUpdate, 
  onDelete,
  onFormat,
  onInteractionStart,
  onInteractionEnd
}: PdfElementProps) {
  const handlePrevious = () => {
    if (element.currentPage > 1) {
      onUpdate({ currentPage: element.currentPage - 1 });
    }
  };

  const handleNext = () => {
    if (element.currentPage < element.totalPages) {
      onUpdate({ currentPage: element.currentPage + 1 });
    }
  };

  const currentPageImage = element.pageImages[element.currentPage - 1];

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
      <div className="w-full h-full flex flex-col">
        {/* PDF Page Display - Direct rendering */}
        <div 
          className="flex-1 flex items-center justify-center relative"
          style={{
            border: borderStyle,
            backgroundColor
          }}
        >
          {currentPageImage && (
            <img
              src={currentPageImage}
              alt={`Page ${element.currentPage} of ${element.totalPages}`}
              className="max-w-full max-h-full object-contain"
              style={{ pointerEvents: 'none' }}
            />
          )}
          
          {/* Navigation Controls - Fixed at bottom */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={element.currentPage === 1}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-xs px-2 min-w-[60px] text-center">
              {element.currentPage}/{element.totalPages}
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={element.currentPage === element.totalPages}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </ResizableElement>
  );
}

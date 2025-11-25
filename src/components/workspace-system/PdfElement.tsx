import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { BaseElement } from '../element-look-and-feel/types';

interface PdfElement extends BaseElement {
  type: 'pdf';
  fileName: string;
  currentPage: number;
  totalPages: number;
  pageImages: string[];
  backgroundColor?: string;
}

interface PdfElementProps {
  element: PdfElement;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onUpdate: (updates: Partial<PdfElement>) => void;
  onDelete: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function PdfElementComponent({
  element,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  onInteractionStart,
  onInteractionEnd
}: PdfElementProps) {
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.currentPage > 1) {
      onUpdate({ currentPage: element.currentPage - 1 });
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.currentPage < element.totalPages) {
      onUpdate({ currentPage: element.currentPage + 1 });
    }
  };

  const currentPageImage = element.pageImages[element.currentPage - 1];

  return (
    <ResizableElement
      element={element}
      isSelected={isSelected}
      containerRef={containerRef}
      actions={{
        onSelect,
        onUpdate,
        onDelete,
        onInteractionStart,
        onInteractionEnd
      }}
      showFormatButton={true}
      showDeleteButton={false}
    >
      <div className="w-full h-full flex flex-col relative">
        {/* PDF Page Display */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            backgroundColor: element.backgroundColor || 'white',
            border: element.borderWidth && element.borderWidth > 0
              ? `${element.borderWidth}px solid ${element.borderColor}`
              : 'none'
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
        </div>
        
        {/* Navigation Controls - Fixed at bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 z-10">
          <button
            onClick={handlePrevious}
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
            onClick={handleNext}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={element.currentPage === element.totalPages}
            className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </ResizableElement>
  );
}

import { useRef, useState, useEffect } from 'react';
import { MousePointer2, Trash2, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { ResizableElementProps } from './types';

export function ResizableElement({
  element,
  isSelected,
  actions,
  containerRef,
  children,
  showFormatButton = true
}: ResizableElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'width' | 'height' | 'both' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSelectIcon, setShowSelectIcon] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const initialSize = useRef({ width: 0, height: 0 });
  const initialMousePos = useRef({ x: 0, y: 0 });

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.onSelect();
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (!isSelected) return;
    
    // Don't start dragging if clicking on resize handles
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) return;

    e.stopPropagation();
    actions.onInteractionStart?.();
    setIsDragging(true);
    const rect = elementRef.current?.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (rect && containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, type: 'width' | 'height' | 'both') => {
    if (!isSelected) return;
    
    e.stopPropagation();
    e.preventDefault();
    actions.onInteractionStart?.();
    setIsResizing(true);
    setResizeType(type);
    initialSize.current = { ...element.size };
    initialMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && containerRef.current && elementRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      
      let newX = e.clientX - containerRect.left - dragOffset.x;
      let newY = e.clientY - containerRect.top - dragOffset.y;

      // Constrain within container
      newX = Math.max(0, Math.min(newX, containerRect.width - element.size.width));
      newY = Math.max(0, Math.min(newY, containerRect.height - element.size.height));

      actions.onUpdate({
        position: { x: newX, y: newY }
      });
    }

    if (isResizing && resizeType) {
      const deltaX = e.clientX - initialMousePos.current.x;
      const deltaY = e.clientY - initialMousePos.current.y;

      if (resizeType === 'width') {
        const newWidth = Math.max(100, initialSize.current.width + deltaX);
        actions.onUpdate({
          size: { width: newWidth, height: element.size.height }
        });
      } else if (resizeType === 'height') {
        const newHeight = Math.max(100, initialSize.current.height + deltaY);
        actions.onUpdate({
          size: { width: element.size.width, height: newHeight }
        });
      } else if (resizeType === 'both') {
        // Maintain aspect ratio
        const aspectRatio = initialSize.current.width / initialSize.current.height;
        const newWidth = Math.max(100, initialSize.current.width + deltaX);
        const newHeight = newWidth / aspectRatio;
        actions.onUpdate({
          size: { width: newWidth, height: newHeight }
        });
      }
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    // Stop propagation and prevent default to prevent canvas click from deselecting
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(false);
    setIsResizing(false);
    setResizeType(null);
    
    // Notify parent that interaction ended
    actions.onInteractionEnd?.();
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      const handleMove = (e: MouseEvent) => {
        e.preventDefault();
        handleMouseMove(e);
      };
      
      const handleUp = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseUp(e);
      };
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp, true); // Use capture phase
      document.addEventListener('click', handleUp, true); // Also capture click events
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp, true);
        document.removeEventListener('click', handleUp, true);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeType]);

  const handleElementMouseMove = (e: React.MouseEvent) => {
    if (isSelected || isDragging || isResizing) return;

    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });

    // Show select icon only when mouse is within 40px from top-left corner
    const cornerThreshold = 40;
    const isNearTopLeftCorner = x <= cornerThreshold && y <= cornerThreshold;
    setShowSelectIcon(isNearTopLeftCorner);
  };

  const handleMouseLeaveElement = () => {
    setShowSelectIcon(false);
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={elementRef}
      className="absolute"
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        zIndex: element.zIndex,
        cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'default')
      }}
      onMouseDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseMove={handleElementMouseMove}
      onMouseLeave={handleMouseLeaveElement}
    >
      {/* Select Icon - Top Left Corner */}
      {!isSelected && showSelectIcon && (
        <div
          className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 shadow-lg z-10"
          onClick={handleSelectClick}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MousePointer2 className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Action Buttons - Appear when selected */}
      {isSelected && (
        <div className="absolute -top-12 left-0 flex gap-2 bg-white border border-gray-300 rounded p-1 shadow-lg z-10">
          {showFormatButton && actions.onFormat && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                actions.onFormat?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              variant="outline"
              size="sm"
              className="gap-2 h-8"
            >
              <Settings className="h-4 w-4" />
              Format
            </Button>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              actions.onDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            variant="outline"
            size="sm"
            className="gap-2 h-8"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Selection Outline */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded" />
      )}

      {/* Content */}
      <div className="w-full h-full relative">
        {children}
      </div>

      {/* Resize Handles - Only visible when selected */}
      {isSelected && (
        <>
          {/* Top Border */}
          <div
            className="resize-handle absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500 hover:h-2 transition-all"
            style={{ marginTop: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'height')}
          />

          {/* Bottom Border */}
          <div
            className="resize-handle absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500 hover:h-2 transition-all"
            style={{ marginBottom: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'height')}
          />

          {/* Left Border */}
          <div
            className="resize-handle absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 hover:w-2 transition-all"
            style={{ marginLeft: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'width')}
          />

          {/* Right Border */}
          <div
            className="resize-handle absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 hover:w-2 transition-all"
            style={{ marginRight: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'width')}
          />

          {/* Bottom Right Corner - Aspect Ratio Resize */}
          <div
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize"
            style={{ 
              marginBottom: '-8px', 
              marginRight: '-8px',
              zIndex: 10
            }}
            onMouseDown={(e) => handleResizeStart(e, 'both')}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          />
        </>
      )}
    </div>
  );
}

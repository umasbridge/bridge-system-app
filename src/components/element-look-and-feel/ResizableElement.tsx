import { useRef, useState, useEffect } from 'react';
import { Trash2, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { ResizableElementProps } from './types';

export function ResizableElement({
  element,
  isSelected,
  actions,
  containerRef,
  children,
  showFormatButton = true,
  showDeleteButton = true,
  minHeight = 100,
  selectionBorderInset = 0,
  ...rest
}: ResizableElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'width' | 'height' | 'both' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const initialSize = useRef({ width: 0, height: 0 });
  const initialMousePos = useRef({ x: 0, y: 0 });

  const handleElementClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Don't select if clicking on buttons or interactive elements
    if (target.closest('button, input, textarea, a, [role="button"]')) {
      return;
    }

    // Don't select if clicking inside contenteditable (user is in edit mode)
    if (target.closest('[contenteditable="true"]')) {
      return;
    }

    // Don't select if clicking on resize handles
    if (target.classList.contains('resize-handle')) {
      return;
    }

    // For table elements, only select if clicking on the border (within 8px of edge)
    if (rest['data-table-element'] !== undefined && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const borderThreshold = 8; // pixels from edge

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const isOnLeftBorder = clickX <= borderThreshold;
      const isOnRightBorder = clickX >= rect.width - borderThreshold;
      const isOnTopBorder = clickY <= borderThreshold;
      const isOnBottomBorder = clickY >= rect.height - borderThreshold;

      const isOnBorder = isOnLeftBorder || isOnRightBorder || isOnTopBorder || isOnBottomBorder;

      if (!isOnBorder) {
        // Clicked inside table content, don't stop propagation
        // This allows the click to bubble to handleContainerClick which will deselect
        return;
      }
    }

    // Select the element if not already selected
    if (!isSelected) {
      e.stopPropagation();
      actions.onSelect();
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Don't drag if clicking on buttons, inputs, or interactive elements
    if (target.closest('button, input, textarea, a, [contenteditable="true"], [role="button"]')) {
      return;
    }

    if (target.classList.contains('resize-handle')) return;

    if (!isSelected) return;

    e.stopPropagation();
    actions.onInteractionStart?.();

    // Set manually positioned flag immediately when drag starts
    actions.onUpdate({ isManuallyPositioned: true });

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

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;

    actions.onUpdate({
      position: {
        x: Math.max(0, Math.min(newX, containerRect.width - element.size.width)),
        y: Math.max(0, Math.min(newY, containerRect.height - element.size.height))
      }
    });
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

  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !resizeType) return;

    const deltaX = e.clientX - initialMousePos.current.x;
    const deltaY = e.clientY - initialMousePos.current.y;

    let newWidth = initialSize.current.width;
    let newHeight = initialSize.current.height;

    if (resizeType === 'width' || resizeType === 'both') {
      newWidth = Math.max(100, initialSize.current.width + deltaX);
    }

    if (resizeType === 'height' || resizeType === 'both') {
      newHeight = Math.max(minHeight, initialSize.current.height + deltaY);
    }

    // For 'both', maintain aspect ratio
    if (resizeType === 'both') {
      const aspectRatio = initialSize.current.width / initialSize.current.height;
      const widthBasedHeight = newWidth / aspectRatio;
      const heightBasedWidth = newHeight * aspectRatio;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = widthBasedHeight;
      } else {
        newWidth = heightBasedWidth;
      }
    }

    actions.onUpdate({
      size: {
        width: newWidth,
        height: newHeight
      }
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsDragging(false);
    setIsResizing(false);
    setResizeType(null);

    actions.onInteractionEnd?.();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeType]);

  return (
    <div
      ref={elementRef}
      className="absolute"
      style={{
        left: element.position.x,
        top: element.position.y,
        width: rest['data-table-element'] !== undefined ? 'auto' : element.size.width,
        height: rest['data-table-element'] !== undefined ? 'auto' : element.size.height,
        zIndex: element.zIndex,
        cursor: isDragging ? 'grabbing' : (isSelected ? 'move' : 'pointer')
      }}
      onMouseDown={handleDragStart}
      onClick={handleElementClick}
      {...rest}
    >
      {/* Blue border when selected - using box-shadow to avoid conflicts with content borders */}
      {isSelected && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: selectionBorderInset,
            left: selectionBorderInset,
            right: selectionBorderInset,
            bottom: selectionBorderInset,
            boxShadow: 'inset 0 0 0 2px rgb(59, 130, 246)',
            zIndex: 1
          }}
        />
      )}

      {/* Content */}
      <div className="w-full h-full relative pointer-events-auto">
        {children}
      </div>

      {/* Delete Button - Only visible when selected and showDeleteButton is true */}
      {isSelected && showDeleteButton && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            actions.onDelete();
          }}
          variant="destructive"
          size="sm"
          className="absolute -bottom-10 right-0 z-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Format Button - Only visible when selected and showFormatButton is true */}
      {isSelected && showFormatButton && actions.onFormat && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            actions.onFormat!();
          }}
          variant="secondary"
          size="sm"
          className="absolute -bottom-10 right-12 z-50"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      {/* Resize Handles - Only visible when selected */}
      {isSelected && (
        <>
          {/* Top Border */}
          <div
            className="resize-handle absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
            style={{ marginTop: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'height')}
          />

          {/* Bottom Border */}
          <div
            className="resize-handle absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
            style={{ marginBottom: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'height')}
          />

          {/* Left Border */}
          <div
            className="resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize"
            style={{ marginLeft: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'width')}
          />

          {/* Right Border */}
          <div
            className="resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize"
            style={{ marginRight: '-2px' }}
            onMouseDown={(e) => handleResizeStart(e, 'width')}
          />

          {/* Bottom-Right Corner - Aspect Ratio Resize */}
          <div
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize"
            style={{ marginBottom: '-4px', marginRight: '-4px' }}
            onMouseDown={(e) => handleResizeStart(e, 'both')}
          />
        </>
      )}
    </div>
  );
}
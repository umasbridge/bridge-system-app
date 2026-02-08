import { useState, useRef, useEffect, ReactNode } from 'react';

interface PopupViewProps {
  position: { x: number; y: number };
  zIndex?: number;
  children: ReactNode;
}

/**
 * PopupView - Positioned floating container for popup pages.
 * Page component renders its own title/X/content/bottom bar inside.
 * This just provides positioning, drag, and shadow.
 */
export function PopupView({
  position,
  zIndex = 100,
  children,
}: PopupViewProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: position.x + 20, y: position.y });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);

  // After first render, measure actual size and position centered on click point
  useEffect(() => {
    if (!popupRef.current) return;

    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      if (!popupRef.current) return;
      const rect = popupRef.current.getBoundingClientRect();
      const actualWidth = rect.width;
      const actualHeight = rect.height;

      // Slightly right of click point
      let x = position.x + 20;
      // Vertically centered on click point
      let y = position.y - actualHeight / 2;

      // Boundary adjustments
      if (x + actualWidth > window.innerWidth - 10) {
        x = position.x - actualWidth - 20;
      }
      if (x < 10) x = 10;
      if (y + actualHeight > window.innerHeight - 10) {
        y = window.innerHeight - actualHeight - 10;
      }
      if (y < 10) y = 10;

      setPos({ x, y });
      setPositioned(true);
    });
  }, [position]);

  // Handle drag start (only from data-popup-header)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-popup-header]')) return;
    // Don't drag if clicking a button
    if (target.closest('button')) return;

    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  // Handle drag movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Keep popup in viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth - 400),
        y: Math.min(prev.y, window.innerHeight - 100),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col"
      style={{
        left: pos.x,
        top: pos.y,
        zIndex,
        width: 'fit-content',
        maxWidth: window.innerWidth - 40,
        maxHeight: window.innerHeight - 40,
        opacity: positioned ? 1 : 0,
        overflow: 'hidden',
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}

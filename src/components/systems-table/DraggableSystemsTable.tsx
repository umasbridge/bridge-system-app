import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { SystemsTable } from './SystemsTable';

interface DraggableSystemsTableProps {
  id: string;
  initialX?: number;
  initialY?: number;
}

export function DraggableSystemsTable({ id, initialX = 20, initialY = 100 }: DraggableSystemsTableProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const tableRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  return (
    <div
      ref={tableRef}
      className="absolute"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="inline-block">
        {/* Drag Handle */}
        <div className="drag-handle flex items-center justify-center py-1 cursor-grab active:cursor-grabbing hover:bg-gray-100">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        
        {/* Table Content */}
        <div>
          <SystemsTable />
        </div>
      </div>
    </div>
  );
}

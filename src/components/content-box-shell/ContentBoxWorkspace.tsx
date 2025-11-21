import { useState, useRef, useCallback } from 'react';
import { ContentBox } from './ContentBox';
import { Button } from '../ui/button';
import { ContentBoxProps } from './types';
import { Plus, Undo } from 'lucide-react';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { FormatPanel } from '../element-look-and-feel/FormatPanel';
import type { BaseElement } from '../element-look-and-feel/types';

interface BoxInstance {
  id: string;
  data: ContentBoxProps;
  selectedElementId: string | null;
}

/**
 * ContentBoxWorkspace Component
 * 
 * A workspace for creating and managing content boxes.
 * Each content box can contain text, links, and files.
 */
export function ContentBoxWorkspace() {
  const [boxes, setBoxes] = useState<BoxInstance[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [formattingBoxId, setFormattingBoxId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [deletedBox, setDeletedBox] = useState<BoxInstance | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleInsertBox = () => {
    const newBox: BoxInstance = {
      id: generateId(),
      data: {
        id: generateId(),
        position: { x: 50, y: 20 + boxes.length * 30 },
        size: { width: 600, height: 848 }, // A4 proportions (210mm × 297mm ratio) scaled to fit screen
        zIndex: boxes.length,
        borderColor: '#D1D5DB',
        borderWidth: 2,
        fillColor: '#FFFFFF',
        elements: []
      },
      selectedElementId: null
    };
    setBoxes([...boxes, newBox]);
  };

  const updateBox = (id: string, updates: Partial<ContentBoxProps>) => {
    setBoxes(
      boxes.map((box) =>
        box.id === id ? { ...box, data: { ...box.data, ...updates } } : box
      )
    );
  };

  const updateBoxElementSelection = (boxId: string, elementId: string | null) => {
    setBoxes(
      boxes.map((box) =>
        box.id === boxId ? { ...box, selectedElementId: elementId } : box
      )
    );
  };

  const deleteBox = (id: string) => {
    const boxToDelete = boxes.find(box => box.id === id);
    if (!boxToDelete) return;

    setDeletedBox(boxToDelete);
    setBoxes(boxes.filter((box) => box.id !== id));
    setSelectedBoxId(null);
    setFormattingBoxId(null);
    setShowUndo(true);

    // Clear any existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Auto-hide after 2 minutes
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
      setDeletedBox(null);
    }, 120000);
  };

  const undoDelete = () => {
    if (deletedBox) {
      setBoxes([...boxes, deletedBox]);
      setDeletedBox(null);
      setShowUndo(false);
      
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  };

  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 150);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isInteracting) {
      setSelectedBoxId(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Top bar with buttons aligned to the right */}
      <div className="w-full px-8 pt-4 pb-4">
        <div className="flex gap-2 justify-end">
          {showUndo && (
            <Button 
              onClick={undoDelete} 
              variant="outline"
              className="gap-2"
            >
              <Undo className="h-4 w-4" />
              Undo Delete
            </Button>
          )}
          
          <Button onClick={handleInsertBox} className="gap-2">
            <Plus className="h-4 w-4" />
            Insert Content Box
          </Button>
        </div>
      </div>

      {/* Canvas for draggable boxes */}
      <div 
        ref={containerRef}
        className="relative w-full min-h-screen px-8"
        onClick={handleCanvasClick}
      >
        {boxes.map((box) => {
          const isSelected = selectedBoxId === box.id;
          
          return (
            <ResizableElement
              key={box.id}
              element={box.data as BaseElement}
              isSelected={isSelected}
              actions={{
                onSelect: () => setSelectedBoxId(box.id),
                onUpdate: (updates) => updateBox(box.id, updates as Partial<ContentBoxProps>),
                onDelete: () => deleteBox(box.id),
                onFormat: () => setFormattingBoxId(box.id),
                onInteractionStart: handleInteractionStart,
                onInteractionEnd: handleInteractionEnd
              }}
              containerRef={containerRef}
              showFormatButton={true}
            >
              <ContentBox
                box={box.data}
                selectedElementId={box.selectedElementId}
                onSelectElement={(elementId) => updateBoxElementSelection(box.id, elementId)}
                onUpdate={(updates) => updateBox(box.id, updates)}
              />
            </ResizableElement>
          );
        })}
      </div>

      {/* Format Panel */}
      {formattingBoxId && (
        <FormatPanel
          element={boxes.find(box => box.id === formattingBoxId)?.data as BaseElement}
          onUpdate={(updates) => updateBox(formattingBoxId, updates as Partial<ContentBoxProps>)}
          onClose={() => setFormattingBoxId(null)}
        />
      )}
    </div>
  );
}

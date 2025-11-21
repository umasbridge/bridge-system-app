import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Plus, Undo2 } from 'lucide-react';
import { ResizableElement } from './ResizableElement';
import { FormatPanel } from './FormatPanel';
import { BaseElement } from './types';

export function ElementWorkspace() {
  const [elements, setElements] = useState<BaseElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [formattingElementId, setFormattingElementId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [deletedElement, setDeletedElement] = useState<BaseElement | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const addElement = () => {
    const newElement: BaseElement = {
      id: generateId(),
      position: { x: 50 + elements.length * 30, y: 50 + elements.length * 30 },
      size: { width: 300, height: 200 },
      zIndex: elements.length,
      borderColor: '#D1D5DB',
      borderWidth: 2,
      fillColor: '#FFFFFF'
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<BaseElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (!elementToDelete) return;
    
    // Store deleted element for undo
    setDeletedElement(elementToDelete);
    setElements(elements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    
    // Show undo button
    setShowUndo(true);
    
    // Clear any existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    
    // Auto-hide undo button after 2 minutes
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
      setDeletedElement(null);
    }, 120000);
  };

  const undoDelete = () => {
    if (deletedElement) {
      setElements([...elements, deletedElement]);
      setDeletedElement(null);
      setShowUndo(false);
      
      // Clear timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleInteractionStart = () => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  };

  const handleInteractionEnd = () => {
    // Keep the flag true for a short period to prevent click events
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 150);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Button onClick={addElement} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Element
          </Button>
          
          {/* Undo Button */}
          {showUndo && (
            <Button 
              onClick={undoDelete} 
              variant="outline"
              className="gap-2 bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <Undo2 className="h-4 w-4" />
              Undo Delete
            </Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="relative w-full h-screen p-8"
        onClick={(e) => {
          // Only deselect if clicking directly on the canvas, not on child elements, and not interacting
          if (e.target === e.currentTarget && !isInteracting) {
            setSelectedElementId(null);
          }
        }}
      >
        {elements.map((element) => (
          <ResizableElement
            key={element.id}
            element={element}
            isSelected={selectedElementId === element.id}
            actions={{
              onSelect: () => setSelectedElementId(element.id),
              onUpdate: (updates) => updateElement(element.id, updates),
              onDelete: () => deleteElement(element.id),
              onFormat: () => setFormattingElementId(element.id),
              onInteractionStart: handleInteractionStart,
              onInteractionEnd: handleInteractionEnd
            }}
            containerRef={containerRef}
            showFormatButton={true}
          >
            {/* Demo content */}
            <div 
              className="w-full h-full rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: element.fillColor || '#FFFFFF',
                border: element.borderWidth === 0 
                  ? 'none' 
                  : `${element.borderWidth ?? 2}px solid ${element.borderColor || '#D1D5DB'}`
              }}
            >
              <div className="text-center">
                <div className="text-gray-500">Element {element.id.substring(0, 4)}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.round(element.size.width)} × {Math.round(element.size.height)}
                </div>
              </div>
            </div>
          </ResizableElement>
        ))}
      </div>

      {/* Format Panel */}
      {formattingElementId && (() => {
        const element = elements.find(el => el.id === formattingElementId);
        if (!element) return null;
        return (
          <FormatPanel
            element={element}
            onUpdate={(updates) => {
              updateElement(formattingElementId, updates);
            }}
            onClose={() => setFormattingElementId(null)}
          />
        );
      })()}
    </div>
  );
}

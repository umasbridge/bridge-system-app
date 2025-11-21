import { useState, useRef, useEffect } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ResizableElement } from './ResizableElement';
import { FormatPanel } from './FormatPanel';
import { BaseElement } from './types';

export function DemoWorkspace() {
  const [elements, setElements] = useState<BaseElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [formattingElementId, setFormattingElementId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [deletedElement, setDeletedElement] = useState<BaseElement | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const addElement = () => {
    // Calculate position with slight offset for each new element
    const offset = elements.length * 30;
    
    const newElement: BaseElement = {
      id: generateId(),
      position: { x: 50 + offset, y: 50 + offset },
      size: { width: 300, height: 200 },
      zIndex: elements.length,
      borderColor: '#3B82F6',
      borderWidth: 2,
      fillColor: '#FFFFFF'
    };
    
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<BaseElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (!elementToDelete) return;
    
    setDeletedElement(elementToDelete);
    setElements(elements.filter(el => el.id !== id));
    setSelectedElementId(null);
    setFormattingElementId(null);
    setShowUndo(true);
    
    // Auto-hide undo button after 2 minutes
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
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
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  };

  const handleContainerClick = () => {
    if (!isInteracting) {
      setSelectedElementId(null);
      setFormattingElementId(null);
    }
  };

  const handleInteractionStart = () => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  };

  const handleInteractionEnd = () => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 150);
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);
  const formattingElement = elements.find(el => el.id === formattingElementId);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div>
          <h1>Element Look & Feel Demo</h1>
          <p className="text-sm text-gray-500">
            {elements.length} element{elements.length !== 1 ? 's' : ''} 
            {selectedElement && ' • 1 selected'}
          </p>
        </div>
        <div className="flex gap-2">
          {showUndo && (
            <Button
              onClick={undoDelete}
              variant="outline"
              className="gap-2"
            >
              <Undo2 className="h-4 w-4" />
              Undo Delete
            </Button>
          )}
          <Button
            onClick={addElement}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Element
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-100"
        onClick={handleContainerClick}
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
            {/* Element Content */}
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundColor: element.fillColor || '#FFFFFF',
                border: element.borderWidth === 0 
                  ? 'none' 
                  : `${element.borderWidth ?? 2}px solid ${element.borderColor || '#D1D5DB'}`
              }}
            >
              <div className="text-center p-4">
                <div className="text-sm text-gray-400 mb-2">Element {elements.indexOf(element) + 1}</div>
                <div className="text-xs text-gray-400">
                  {element.size.width} × {element.size.height}
                </div>
              </div>
            </div>
          </ResizableElement>
        ))}

        {/* Empty State */}
        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">No elements yet</div>
              <Button onClick={addElement} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Element
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Format Panel */}
      {formattingElement && (
        <FormatPanel
          element={formattingElement}
          onUpdate={(updates) => updateElement(formattingElement.id, updates)}
          onClose={() => setFormattingElementId(null)}
        />
      )}

      {/* Instructions Panel */}
      <div className="h-20 bg-white border-t border-gray-200 flex items-center justify-center px-6">
        <div className="text-sm text-gray-600 text-center">
          <strong>How to use:</strong> Click "Add Element" to create • Hover top-left corner to select • 
          Drag to move • Drag edges to resize • Drag corner for aspect ratio • Click "Format" to style
        </div>
      </div>
    </div>
  );
}

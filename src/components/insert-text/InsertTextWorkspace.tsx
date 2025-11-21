import { useState, useRef, useEffect } from 'react';
import { Type, Undo2 } from 'lucide-react';
import { Button } from '../ui/button';
import { FormatPanel } from '../element-look-and-feel/FormatPanel';
import { TextElement } from './TextElement';
import { TextElement as TextElementType } from './types';

export function InsertTextWorkspace() {
  const [elements, setElements] = useState<TextElementType[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [interactionInProgress, setInteractionInProgress] = useState(false);
  const [deletedElement, setDeletedElement] = useState<TextElementType | null>(null);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleInsertText = () => {
    const nextZIndex = elements.length > 0 
      ? Math.max(...elements.map(el => el.zIndex)) + 1 
      : 1;

    const newElement: TextElementType = {
      id: generateId(),
      type: 'text',
      text: '',
      position: { x: 100, y: 100 },
      size: { width: 600, height: 150 },
      zIndex: nextZIndex,
      borderColor: 'transparent',
      borderWidth: 0,
      fillColor: 'transparent'
    };
    
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<TextElementType>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (elementToDelete) {
      setDeletedElement(elementToDelete);
      setShowUndoNotification(true);
      
      // Clear any existing timer
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      
      // Set 2-minute timer to clear undo option
      undoTimerRef.current = setTimeout(() => {
        setShowUndoNotification(false);
        setDeletedElement(null);
      }, 120000); // 2 minutes = 120000ms
    }
    
    setElements(elements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setShowFormatPanel(false);
    }
  };

  const handleUndo = () => {
    if (deletedElement) {
      setElements([...elements, deletedElement]);
      setDeletedElement(null);
      setShowUndoNotification(false);
      
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const handleCanvasClick = () => {
    if (!interactionInProgress) {
      setSelectedElementId(null);
      setShowFormatPanel(false);
    }
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header with button */}
      <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
        <Button onClick={handleInsertText} variant="outline" className="gap-2">
          <Type className="h-4 w-4" />
          Insert Text
        </Button>
      </div>

      {/* Workspace Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-gray-50 overflow-auto"
        onClick={handleCanvasClick}
      >
        {elements.map((element) => (
          <TextElement
            key={element.id}
            element={element}
            isSelected={selectedElementId === element.id}
            containerRef={containerRef}
            onSelect={() => setSelectedElementId(element.id)}
            onUpdate={(updates) => updateElement(element.id, updates)}
            onDelete={() => deleteElement(element.id)}
            onFormat={() => setShowFormatPanel(true)}
            onInteractionStart={() => setInteractionInProgress(true)}
            onInteractionEnd={() => setInteractionInProgress(false)}
          />
        ))}
      </div>

      {/* Format Panel */}
      {showFormatPanel && selectedElement && (
        <FormatPanel
          element={selectedElement}
          onUpdate={(updates) => {
            if (selectedElementId) {
              updateElement(selectedElementId, updates);
            }
          }}
          onClose={() => setShowFormatPanel(false)}
        />
      )}

      {/* Undo Delete Button - Positioned where element was */}
      {showUndoNotification && deletedElement && (
        <div 
          className="absolute z-50"
          style={{
            left: deletedElement.position.x,
            top: deletedElement.position.y - 48
          }}
        >
          <Button
            onClick={handleUndo}
            variant="outline"
            size="sm"
            className="gap-2 h-8 bg-white shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <Undo2 className="h-4 w-4" />
            Undo Delete
          </Button>
        </div>
      )}
    </div>
  );
}

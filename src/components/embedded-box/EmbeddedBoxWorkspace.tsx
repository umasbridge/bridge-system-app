import { useState } from 'react';
import { Button } from '../ui/button';
import { EmbeddedBoxElement } from './EmbeddedBoxElement';
import { EmbeddedBoxElement as EmbeddedBoxElementType } from './types';

export function EmbeddedBoxWorkspace() {
  const [elements, setElements] = useState<EmbeddedBoxElementType[]>([]);

  const handleInsertBox = () => {
    const newElement: EmbeddedBoxElementType = {
      id: `embedded-box-${Date.now()}`,
      type: 'embedded-box',
      text: '',
      htmlContent: '',
      imageSrc: null,
      position: { x: 100, y: 100 },
      size: { width: 600, height: 150 },
      zIndex: elements.length + 1,
    };

    setElements([...elements, newElement]);
  };

  const handleUpdateElement = (id: string, updates: Partial<EmbeddedBoxElementType>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-white">
        <Button onClick={handleInsertBox} variant="default">
          Embedded Box
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 relative overflow-auto">
        {elements.map((element) => (
          <EmbeddedBoxElement
            key={element.id}
            element={element}
            onUpdate={(updates) => handleUpdateElement(element.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

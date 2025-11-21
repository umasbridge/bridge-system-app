import { useState } from 'react';
import { Button } from '../ui/button';
import { EmbeddedContentElement } from './EmbeddedContentElement';
import { EmbeddedContentElement as EmbeddedContentElementType } from './types';

export function EmbeddedContentWorkspace() {
  const [elements, setElements] = useState<EmbeddedContentElementType[]>([]);

  const handleInsertContent = () => {
    const newElement: EmbeddedContentElementType = {
      id: `embedded-${Date.now()}`,
      type: 'embedded-content',
      text: '',
      htmlContent: '',
      imageSrc: null,
      position: { x: 100, y: 100 },
      size: { width: 600, height: 150 },
      zIndex: elements.length + 1,
    };

    setElements([...elements, newElement]);
  };

  const handleUpdateElement = (id: string, updates: Partial<EmbeddedContentElementType>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-white">
        <Button onClick={handleInsertContent} variant="default">
          Embedded Text
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 relative overflow-auto">
        {elements.map((element) => (
          <EmbeddedContentElement
            key={element.id}
            element={element}
            onUpdate={(updates) => handleUpdateElement(element.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

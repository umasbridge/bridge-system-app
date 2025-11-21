import { useRef, useEffect } from 'react';
import { TextBoxElement } from './TextBoxElement';
import { LinkElement } from './LinkElement';
import { FileElement } from './FileElement';
import {
  ContentBoxProps,
  ContentElement,
  TextElement,
  LinkElement as LinkElementType,
  FileElement as FileElementType
} from './types';

interface ContentBoxComponentProps {
  box: ContentBoxProps;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdate: (updates: Partial<ContentBoxProps>) => void;
}

export function ContentBox({ box, selectedElementId, onSelectElement, onUpdate }: ContentBoxComponentProps) {
  const contentSpaceRef = useRef<HTMLDivElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Auto-resize based on content
  useEffect(() => {
    if (contentSpaceRef.current) {
      const contentHeight = contentSpaceRef.current.scrollHeight;
      const newHeight = contentHeight + 32; // Add padding
      
      if (newHeight !== box.size.height) {
        onUpdate({ 
          size: { 
            ...box.size,
            height: Math.max(848, newHeight) // Minimum height of 848 (A4 proportions scaled to screen)
          } 
        });
      }
    }
  }, [box.elements]);

  const updateElement = (id: string, updates: Partial<ContentElement>) => {
    const updatedElements = box.elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    onUpdate({ elements: updatedElements });
  };

  const deleteElement = (id: string) => {
    const updatedElements = box.elements.filter((el) => el.id !== id);
    onUpdate({ elements: updatedElements });
    onSelectElement(null);
  };

  return (
    <div 
      className="w-full h-full relative flex flex-col"
      style={{
        backgroundColor: box.fillColor || '#FFFFFF',
        border: box.borderWidth === 0 
          ? 'none' 
          : `${box.borderWidth ?? 2}px solid ${box.borderColor || '#D1D5DB'}`
      }}
    >
      {/* Content Space */}
      <div
        ref={contentSpaceRef}
        className="flex-1 flex flex-col gap-4 p-4 overflow-auto"
      >
        {box.elements.map((element) => {
          const isElementSelected = element.id === selectedElementId;

          if (element.type === 'text') {
            return (
              <TextBoxElement
                key={element.id}
                element={element as TextElement}
                isSelected={isElementSelected}
                onSelect={() => onSelectElement(element.id)}
                onUpdate={(updates) => updateElement(element.id, updates)}
                onDelete={() => deleteElement(element.id)}
              />
            );
          }

          if (element.type === 'link') {
            return (
              <LinkElement
                key={element.id}
                element={element as LinkElementType}
                isSelected={isElementSelected}
                onSelect={() => onSelectElement(element.id)}
                onUpdate={(updates) => updateElement(element.id, updates)}
                onDelete={() => deleteElement(element.id)}
              />
            );
          }

          if (element.type === 'file') {
            return (
              <FileElement
                key={element.id}
                element={element as FileElementType}
                isSelected={isElementSelected}
                onSelect={() => onSelectElement(element.id)}
                onUpdate={(updates) => updateElement(element.id, updates)}
                onDelete={() => deleteElement(element.id)}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

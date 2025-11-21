import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { BaseElement } from '../element-look-and-feel/types';
import { SystemsTable, RowData } from '../systems-table';
import { SystemsTableFormatPanel } from '../systems-table/SystemsTableFormatPanel';
import { TextElementComponent, TextElement } from './TextElement';
import { TextFormatPanel } from './TextFormatPanel';
import { TextElementFormatPanel } from './TextElementFormatPanel';
import { PdfElementComponent } from './PdfElement';
import * as pdfjsLib from 'pdfjs-dist';

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
}

interface SystemsTableElement extends BaseElement {
  type: 'systems-table';
  initialRows?: RowData[];
  gridlines?: GridlineOptions;
}



interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
}

interface PdfElement extends BaseElement {
  type: 'pdf';
  fileName: string;
  currentPage: number;
  totalPages: number;
  pageImages: string[]; // array of base64 encoded page images
}

interface FileElement extends BaseElement {
  type: 'file';
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

type WorkspaceElement = SystemsTableElement | TextElement | ImageElement | PdfElement | FileElement;

interface WorkspaceEditorProps {
  workspaceId: string;
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
  onClose?: () => void;
  existingWorkspaces?: string[];
  onNavigateToWorkspace?: (workspaceName: string, linkType: 'comment' | 'new-page', position?: { x: number; y: number }) => void;
  hideControls?: boolean;
  initialElements?: WorkspaceElement[];
}

const ELEMENT_SPACING = 10; // Consistent spacing between all elements

export function WorkspaceEditor({ 
  workspaceId, 
  initialTitle = 'Untitled Workspace',
  onTitleChange,
  onClose,
  existingWorkspaces = [],
  onNavigateToWorkspace,
  hideControls = false,
  initialElements = []
}: WorkspaceEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [elements, setElements] = useState<WorkspaceElement[]>(() => {
    // If initial elements are provided, use them
    if (initialElements.length > 0) {
      return initialElements;
    }
    // Otherwise, create a default text element with "Title" content
    const defaultElement: TextElement = {
      id: 'title-' + Math.random().toString(36).substring(7),
      type: 'text',
      position: { x: 20, y: 20 },
      size: { width: 600, height: 34 },
      zIndex: 0,
      content: 'Title',
      htmlContent: '<div>Title</div>',
      borderColor: 'transparent',
      borderWidth: 0
    };
    return [defaultElement];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formatPanelId, setFormatPanelId] = useState<string | null>(null);
  const [deletedElement, setDeletedElement] = useState<WorkspaceElement | null>(null);
  const [focusedTextElementId, setFocusedTextElementId] = useState<string | null>(null);
  const [focusedCellId, setFocusedCellId] = useState<{ tableId: string; rowId: string; column: 'bid' | 'meaning' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tableRowsRef = useRef<Map<string, RowData[]>>(new Map());
  const textElementApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const cellApplyFormatRef = useRef<((format: any) => void) | null>(null);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const getNextPosition = () => {
    // Find the bottom-most element and add consistent spacing below it
    if (elements.length === 0) {
      return { x: 20, y: 20 };
    }
    
    // Find the element with the highest bottom edge
    let maxBottom = 0;
    let bottomElement: WorkspaceElement | null = null;
    elements.forEach(el => {
      const bottom = el.position.y + el.size.height;
      if (bottom > maxBottom) {
        maxBottom = bottom;
        bottomElement = el;
      }
    });
    
    // Use less spacing after tables, normal spacing after other elements
    const spacing = bottomElement?.type === 'systems-table' ? 5 : ELEMENT_SPACING;
    return { x: 20, y: maxBottom + spacing };
  };

  const handleInsertSystemsTable = () => {
    const position = getNextPosition();
    const newElement: SystemsTableElement = {
      id: Math.random().toString(36).substring(7),
      type: 'systems-table',
      position,
      size: { width: 680, height: 200 },
      zIndex: elements.length,
      borderColor: 'transparent',
      borderWidth: 0,
      gridlines: {
        enabled: false,
        color: '#D1D5DB',
        width: 1
      }
    };
    setElements([...elements, newElement]);
  };

  const handleInsertText = () => {
    const position = getNextPosition();
    const newElement: TextElement = {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      position,
      size: { width: 600, height: 34 },
      zIndex: elements.length,
      content: '',
      borderColor: 'transparent',
      borderWidth: 0
    };
    setElements([...elements, newElement]);
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const position = getNextPosition();
          const newElement: ImageElement = {
            id: Math.random().toString(36).substring(7),
            type: 'image',
            position,
            size: { width: 400, height: 300 },
            zIndex: elements.length,
            src: event.target?.result as string,
            alt: file.name,
            borderColor: 'transparent',
            borderWidth: 0
          };
          setElements([...elements, newElement]);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUploadFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const position = getNextPosition();
        
        // Handle PDFs specially
        if (file.type === 'application/pdf') {
          try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Set worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pageImages: string[] = [];
            
            // Convert all pages to images
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                pageImages.push(canvas.toDataURL());
              }
            }
            
            const newElement: PdfElement = {
              id: Math.random().toString(36).substring(7),
              type: 'pdf',
              position,
              size: { width: 600, height: 800 },
              zIndex: elements.length,
              fileName: file.name,
              currentPage: 1,
              totalPages: pdf.numPages,
              pageImages,
              borderColor: 'transparent',
              borderWidth: 0
            };
            setElements([...elements, newElement]);
          } catch (error) {
            console.error('Error processing PDF:', error);
          }
        } else {
          // Handle other file types
          const newElement: FileElement = {
            id: Math.random().toString(36).substring(7),
            type: 'file',
            position,
            size: { width: 400, height: 80 },
            zIndex: elements.length,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            borderColor: 'transparent',
            borderWidth: 0
          };
          setElements([...elements, newElement]);
        }
      }
    };
    input.click();
  };

  const handleUpdate = (id: string, updates: Partial<BaseElement>) => {
    setElements(elements.map((el, index) => {
      if (el.id === id) {
        const updated = { ...el, ...updates };
        
        // If position is being updated, mark as manually positioned
        if (updates.position && !updates.isManuallyPositioned) {
          updated.isManuallyPositioned = true;
        }
        
        // If this is the first element (default title element) and content is being updated
        if (index === 0 && 'content' in updated) {
          const textContent = (updated as TextElement).content || '';
          handleTitleChange(textContent);
        }
        return updated;
      }
      return el;
    }));
  };

  const handleDelete = (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (!elementToDelete) return;
    
    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (formatPanelId === id) setFormatPanelId(null);
    
    setDeletedElement(elementToDelete);
    tableRowsRef.current.delete(id);
    
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setDeletedElement(null);
    }, 10000);
  };

  const handleUndo = () => {
    if (deletedElement) {
      setElements(prev => [...prev, deletedElement]);
      setDeletedElement(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    }
  };

  const handleRowsChange = (elementId: string, rows: RowData[]) => {
    tableRowsRef.current.set(elementId, rows);
  };

  const handleContentSizeChange = (elementId: string, width: number, height: number) => {
    setElements(elements => elements.map(el => 
      el.id === elementId 
        ? { ...el, size: { width, height } } 
        : el
    ));
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  // Auto-reposition elements when sizes change
  useEffect(() => {
    let hasChanges = false;
    const updatedElements = [...elements];
    
    // Sort elements by their zIndex/creation order to maintain intended stacking
    const sortedIndices = elements
      .map((_, index) => index)
      .sort((a, b) => elements[a].zIndex - elements[b].zIndex);
    
    // Calculate target Y position for each element
    let cumulativeY = 20; // Start position
    
    for (let i = 0; i < sortedIndices.length; i++) {
      const index = sortedIndices[i];
      const element = elements[index];
      
      // Skip manually positioned elements - they don't participate in auto-layout
      if (element.isManuallyPositioned) {
        continue;
      }
      
      // Update position if it has changed
      if (element.position.y !== cumulativeY) {
        updatedElements[index] = {
          ...element,
          position: { ...element.position, y: cumulativeY }
        };
        hasChanges = true;
      }
      
      // Move cumulative Y down by this element's height plus spacing
      cumulativeY += element.size.height + ELEMENT_SPACING;
    }
    
    if (hasChanges) {
      setElements(updatedElements);
    }
  }, [elements.map(el => `${el.id}-${el.size.height}-${el.isManuallyPositioned}`).join(',')]);
  
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const selectedElement = elements.find(el => el.id === formatPanelId);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto bg-white"
        onClick={handleContainerClick}
      >
        {elements.map((element) => {
          if (element.type === 'systems-table') {
            const tableElement = element as SystemsTableElement;
            
            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                showFormatButton={true}
                actions={{
                  onSelect: () => setSelectedId(element.id),
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id),
                  onFormat: () => setFormatPanelId(element.id)
                }}
                data-table-element
              >
                <div 
                  className="block overflow-visible leading-none"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0 && element.borderColor !== 'transparent'
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : 'none'
                  }}
                >
                  <SystemsTable 
                    initialRows={tableElement.initialRows} 
                    gridlines={tableElement.gridlines}
                    onRowsChange={(rows) => handleRowsChange(element.id, rows)}
                    onCellFocusChange={(rowId, column, isFocused, applyFormatFn) => {
                      if (isFocused) {
                        setFocusedCellId({ tableId: element.id, rowId, column });
                        if (applyFormatFn) {
                          cellApplyFormatRef.current = applyFormatFn;
                        }
                      } else if (focusedCellId?.tableId === element.id && focusedCellId?.rowId === rowId && focusedCellId?.column === column) {
                        setFocusedCellId(null);
                        cellApplyFormatRef.current = null;
                      }
                    }}
                  />
                </div>
              </ResizableElement>
            );
          }
          
          if (element.type === 'text') {
            const textElement = element as TextElement;
            const isFocused = focusedTextElementId === element.id;
            const isElementSelected = selectedId === element.id && !isFocused;
            
            return (
              <TextElementComponent
                key={element.id}
                element={textElement}
                isSelected={isElementSelected}
                containerRef={containerRef}
                onSelect={() => setSelectedId(element.id)}
                onUpdate={(updates) => handleUpdate(element.id, updates)}
                onDelete={() => handleDelete(element.id)}
                existingWorkspaces={existingWorkspaces}
                onNavigateToWorkspace={onNavigateToWorkspace}
                onFocusChange={(isFocused, applyFormatFn) => {
                  if (isFocused) {
                    // Entering edit mode - clear selection
                    setSelectedId(null);
                    setFocusedTextElementId(element.id);
                    // Store the apply format function
                    if (applyFormatFn) {
                      textElementApplyFormatRef.current = applyFormatFn;
                    }
                  } else if (focusedTextElementId === element.id) {
                    setFocusedTextElementId(null);
                    textElementApplyFormatRef.current = null;
                  }
                }}
              />
            );
          }
          
          if (element.type === 'image') {
            const imageElement = element as ImageElement;
            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                actions={{
                  onSelect: () => setSelectedId(element.id),
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id)
                }}
              >
                <img 
                  src={imageElement.src} 
                  alt={imageElement.alt || 'Uploaded image'}
                  className="w-full h-full object-contain"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : 'none'
                  }}
                />
              </ResizableElement>
            );
          }
          
          if (element.type === 'pdf') {
            const pdfElement = element as PdfElement;
            return (
              <PdfElementComponent
                key={element.id}
                element={pdfElement}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                onSelect={() => setSelectedId(element.id)}
                onUpdate={(updates) => handleUpdate(element.id, updates)}
                onDelete={() => handleDelete(element.id)}
              />
            );
          }
          
          if (element.type === 'file') {
            const fileElement = element as FileElement;
            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                actions={{
                  onSelect: () => setSelectedId(element.id),
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id)
                }}
              >
                <div 
                  className="w-full h-full p-4 bg-white flex items-center gap-3"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : '1px solid #e5e7eb'
                  }}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{fileElement.fileName}</p>
                    {fileElement.fileSize && (
                      <p className="text-xs text-gray-500">
                        {(fileElement.fileSize / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
              </ResizableElement>
            );
          }
          
          return null;
        })}

        {/* Format Panel for Systems Tables */}
        {selectedElement && selectedElement.type === 'systems-table' && formatPanelId && (
          <SystemsTableFormatPanel
            element={selectedElement as SystemsTableElement}
            onUpdate={(updates) => handleUpdate(formatPanelId, updates)}
            onClose={() => setFormatPanelId(null)}
          />
        )}

        {/* Text Format Panel - Appears on right side when text element is focused */}
        {focusedTextElementId && (
          <div 
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText=""
              onClose={() => setFocusedTextElementId(null)}
              onApply={(format) => {
                if (textElementApplyFormatRef.current) {
                  textElementApplyFormatRef.current(format);
                }
              }}
              isSidePanel={true}
            />
          </div>
        )}

        {/* Cell Format Panel - Appears on right side when table cell is focused */}
        {focusedCellId && (
          <div 
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText=""
              onClose={() => {
                setFocusedCellId(null);
                cellApplyFormatRef.current = null;
              }}
              onApply={(format) => {
                if (cellApplyFormatRef.current) {
                  cellApplyFormatRef.current(format);
                }
              }}
              isSidePanel={true}
            />
          </div>
        )}

        {/* Undo Button */}
        {deletedElement && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${deletedElement.position.x}px`,
              top: `${deletedElement.position.y}px`,
              zIndex: 10000
            }}
          >
            <Button
              onClick={handleUndo}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              Undo Delete
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Button Bar */}
      {!hideControls && (
        <div className="bg-white border-t border-gray-200 px-8 py-4 flex-shrink-0">
          <div className="flex gap-2">
            <Button onClick={handleInsertSystemsTable} variant="outline">
              Insert Systems Table
            </Button>
            <Button onClick={handleInsertText} variant="outline">
              Insert Text
            </Button>
            <Button onClick={handleUploadFile} variant="outline">
              Upload File
            </Button>
            <Button onClick={handleInsertImage} variant="outline">
              Insert Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
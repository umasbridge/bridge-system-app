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
import { elementOperations, WorkspaceElement as DBWorkspaceElement } from '../../db/database';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

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
  onNavigateToWorkspace?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }) => void;
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
  const [elements, setElements] = useState<WorkspaceElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [formatPanelId, setFormatPanelId] = useState<string | null>(null);
  const [deletedElement, setDeletedElement] = useState<WorkspaceElement | null>(null);
  const [focusedTextElementId, setFocusedTextElementId] = useState<string | null>(null);
  const [focusedCellId, setFocusedCellId] = useState<{ tableId: string; rowId: string; column: 'bid' | 'meaning' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tableRowsRef = useRef<Map<string, RowData[]>>(new Map());
  const textElementApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const textElementApplyHyperlinkRef = useRef<((workspaceName: string, linkType: 'comment' | 'new-page') => void) | null>(null);
  const cellApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const cellApplyHyperlinkRef = useRef<((workspaceName: string, linkType: 'comment' | 'new-page') => void) | null>(null);
  const [textElementSelectedText, setTextElementSelectedText] = useState<string>('');
  const [cellSelectedText, setCellSelectedText] = useState<string>('');

  // Load elements from DB on mount
  useEffect(() => {
    const loadElements = async () => {
      setIsLoading(true);
      const dbElements = await elementOperations.getByWorkspaceId(workspaceId);

      if (dbElements.length === 0 && initialElements.length === 0) {
        // Create default text element with "Title" content
        const defaultElement: TextElement & { workspaceId: string } = {
          id: 'title-' + Math.random().toString(36).substring(7),
          workspaceId,
          type: 'text',
          position: { x: 20, y: 20 },
          size: { width: 600, height: 34 },
          zIndex: 0,
          content: 'Title',
          htmlContent: '<div>Title</div>',
          borderColor: 'transparent',
          borderWidth: 0
        };
        await elementOperations.create(defaultElement);
        setElements([defaultElement]);
      } else if (dbElements.length > 0) {
        setElements(dbElements);
      } else if (initialElements.length > 0) {
        // Use initial elements if provided (for popup comment boxes)
        setElements(initialElements);
      }

      setIsLoading(false);
    };

    loadElements();
  }, [workspaceId]);

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

  const handleInsertSystemsTable = async () => {
    const position = getNextPosition();
    // Calculate height based on initial row count (default 1 row = ~100px with padding)
    const initialRowCount = 1;
    const calculatedHeight = Math.max(100, initialRowCount * 80 + 20);

    const newElement: SystemsTableElement & { workspaceId: string } = {
      id: Math.random().toString(36).substring(7),
      workspaceId,
      type: 'systems-table',
      position,
      size: { width: 680, height: calculatedHeight },
      zIndex: elements.length,
      borderColor: 'transparent',
      borderWidth: 0,
      gridlines: {
        enabled: false,
        color: '#D1D5DB',
        width: 1
      }
    };
    await elementOperations.create(newElement);
    setElements([...elements, newElement]);
  };

  const handleInsertText = async () => {
    const position = getNextPosition();
    const newElement: TextElement & { workspaceId: string } = {
      id: Math.random().toString(36).substring(7),
      workspaceId,
      type: 'text',
      position,
      size: { width: 600, height: 34 },
      zIndex: elements.length,
      content: '',
      borderColor: 'transparent',
      borderWidth: 0
    };
    await elementOperations.create(newElement);
    setElements([...elements, newElement]);
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const position = getNextPosition();
          const newElement: ImageElement & { workspaceId: string } = {
            id: Math.random().toString(36).substring(7),
            workspaceId,
            type: 'image',
            position,
            size: { width: 400, height: 300 },
            zIndex: elements.length,
            src: event.target?.result as string,
            alt: file.name,
            borderColor: 'transparent',
            borderWidth: 0
          };
          await elementOperations.create(newElement);
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
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.type === 'application/pdf') {
        const position = getNextPosition();
        console.log('PDF position:', position, 'elements count:', elements.length);
        try {
          const arrayBuffer = await file.arrayBuffer();

          // Set worker source to local worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

          const newElement: PdfElement & { workspaceId: string } = {
            id: Math.random().toString(36).substring(7),
            workspaceId,
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
          await elementOperations.create(newElement);
          setElements([...elements, newElement]);
        } catch (error) {
          console.error('Error processing PDF:', error);
          console.error('Error details:', error instanceof Error ? error.message : String(error));
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          alert(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    input.click();
  };

  const handleUpdate = async (id: string, updates: Partial<BaseElement>) => {
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

        // Update in DB (async, don't wait)
        elementOperations.update(id, updates);

        return updated;
      }
      return el;
    }));
  };

  const handleDelete = async (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (!elementToDelete) return;

    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (formatPanelId === id) setFormatPanelId(null);

    setDeletedElement(elementToDelete);
    tableRowsRef.current.delete(id);

    // Delete from DB (will be restored if undo is triggered)
    await elementOperations.delete(id);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setDeletedElement(null);
    }, 10000);
  };

  const handleUndo = async () => {
    if (deletedElement) {
      // Restore to DB
      await elementOperations.create(deletedElement as any);
      setElements(prev => [...prev, deletedElement]);
      setDeletedElement(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    }
  };

  const handleRowsChange = async (elementId: string, rows: RowData[]) => {
    tableRowsRef.current.set(elementId, rows);
    // Persist to database
    await elementOperations.update(elementId, { initialRows: rows } as Partial<DBWorkspaceElement>);
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
    if (isLoading || isInteracting) return; // Don't reposition while loading or during drag/resize

    let hasChanges = false;
    const updatedElements = [...elements];

    // Separate manually positioned and auto-layout elements
    const manualElements = elements.filter(el => el.isManuallyPositioned);
    const autoElements = elements.filter(el => !el.isManuallyPositioned);

    // Sort auto-layout elements by zIndex
    const sortedAutoIndices = elements
      .map((el, index) => ({ el, index }))
      .filter(({ el }) => !el.isManuallyPositioned)
      .sort((a, b) => a.el.zIndex - b.el.zIndex);

    let cumulativeY = 20; // Start position

    for (let i = 0; i < sortedAutoIndices.length; i++) {
      const { index, el: element } = sortedAutoIndices[i];

      // Check if any manually positioned element occupies this Y range
      let conflictFound = true;
      while (conflictFound) {
        conflictFound = false;
        for (const manualEl of manualElements) {
          const manualTop = manualEl.position.y;
          const manualBottom = manualEl.position.y + manualEl.size.height;
          const proposedBottom = cumulativeY + element.size.height;

          // If proposed position overlaps with manual element, move below it
          if (cumulativeY < manualBottom && proposedBottom > manualTop) {
            cumulativeY = manualBottom + ELEMENT_SPACING;
            conflictFound = true;
            break;
          }
        }
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
      // Bulk update DB with new positions
      elementOperations.bulkUpdate(updatedElements as any);
    }
  }, [elements.map(el => `${el.id}-${el.size.height}-${el.isManuallyPositioned}-${el.position.y}`).join(','), isLoading, isInteracting]);
  
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
      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading workspace...</p>
        </div>
      )}

      {/* Canvas Area */}
      {!isLoading && (
        <>
      <div
        ref={containerRef}
        className="flex-1 relative overflow-auto bg-white"
        onClick={handleContainerClick}
      >
        {elements.map((element) => {
          if (element.type === 'systems-table') {
            const tableElement = element as SystemsTableElement;
            const isTableSelected = selectedId === element.id && focusedCellId?.tableId !== element.id;

            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={isTableSelected}
                containerRef={containerRef}
                showFormatButton={true}
                minHeight={50}
                actions={{
                  onSelect: () => setSelectedId(element.id),
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id),
                  onFormat: () => setFormatPanelId(element.id),
                  onInteractionStart: () => setIsInteracting(true),
                  onInteractionEnd: () => setIsInteracting(false)
                }}
                data-table-element
              >
                <div
                  className="inline-block"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0 && element.borderColor !== 'transparent'
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : 'none'
                  }}
                >
                  <SystemsTable
                    initialRows={tableElement.initialRows}
                    gridlines={tableElement.gridlines}
                    initialLevelWidths={tableElement.levelWidths}
                    initialMeaningWidth={tableElement.meaningWidth}
                    onRowsChange={(rows) => handleRowsChange(element.id, rows)}
                    onLevelWidthsChange={(levelWidths) => {
                      elementOperations.update(element.id, { levelWidths } as Partial<DBWorkspaceElement>);
                    }}
                    onMeaningWidthChange={(meaningWidth) => {
                      elementOperations.update(element.id, { meaningWidth } as Partial<DBWorkspaceElement>);
                    }}
                    onCellFocusChange={(rowId, column, isFocused, applyFormatFn, applyHyperlinkFn, selectedText) => {
                      if (isFocused) {
                        setFocusedCellId({ tableId: element.id, rowId, column });
                        if (applyFormatFn) {
                          cellApplyFormatRef.current = applyFormatFn;
                        }
                        if (applyHyperlinkFn) {
                          cellApplyHyperlinkRef.current = applyHyperlinkFn;
                        }
                        if (selectedText) {
                          setCellSelectedText(selectedText);
                        }
                      } else if (focusedCellId?.tableId === element.id && focusedCellId?.rowId === rowId && focusedCellId?.column === column) {
                        setFocusedCellId(null);
                        cellApplyFormatRef.current = null;
                        cellApplyHyperlinkRef.current = null;
                        setCellSelectedText('');
                      }
                    }}
                    workspaceId={workspaceId}
                    elementId={element.id}
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
                onFocusChange={(isFocused, applyFormatFn, applyHyperlinkFn, selectedText) => {
                  if (isFocused) {
                    // Entering edit mode - clear selection
                    setSelectedId(null);
                    setFocusedTextElementId(element.id);
                    // Store the apply format and hyperlink functions
                    if (applyFormatFn) {
                      textElementApplyFormatRef.current = applyFormatFn;
                    }
                    if (applyHyperlinkFn) {
                      textElementApplyHyperlinkRef.current = applyHyperlinkFn;
                    }
                    // Update selected text
                    setTextElementSelectedText(selectedText || '');
                  } else if (focusedTextElementId === element.id) {
                    setFocusedTextElementId(null);
                    textElementApplyFormatRef.current = null;
                    textElementApplyHyperlinkRef.current = null;
                    setTextElementSelectedText('');
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
                  onDelete: () => handleDelete(element.id),
                  onInteractionStart: () => setIsInteracting(true),
                  onInteractionEnd: () => setIsInteracting(false)
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
                onInteractionStart={() => setIsInteracting(true)}
                onInteractionEnd={() => setIsInteracting(false)}
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
                  onDelete: () => handleDelete(element.id),
                  onInteractionStart: () => setIsInteracting(true),
                  onInteractionEnd: () => setIsInteracting(false)
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
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white rounded-l-lg shadow-lg border border-gray-200 p-4 w-64"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText={textElementSelectedText}
              onClose={() => setFocusedTextElementId(null)}
              onApply={(format) => {
                if (textElementApplyFormatRef.current) {
                  textElementApplyFormatRef.current(format);
                }
              }}
              onApplyHyperlink={(workspaceName, linkType) => {
                if (textElementApplyHyperlinkRef.current) {
                  textElementApplyHyperlinkRef.current(workspaceName, linkType);
                }
              }}
              isSidePanel={true}
            />
          </div>
        )}

        {/* Cell Format Panel - Appears on right side when table cell is focused */}
        {focusedCellId && (
          <div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white rounded-l-lg shadow-lg border border-gray-200 p-4 w-64"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText={cellSelectedText}
              onClose={() => {
                setFocusedCellId(null);
                cellApplyFormatRef.current = null;
                cellApplyHyperlinkRef.current = null;
                setCellSelectedText('');
              }}
              onApply={(format) => {
                if (cellApplyFormatRef.current) {
                  cellApplyFormatRef.current(format);
                }
              }}
              onApplyHyperlink={(workspaceName, linkType) => {
                if (cellApplyHyperlinkRef.current) {
                  cellApplyHyperlinkRef.current(workspaceName, linkType);
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
        </>
      )}
    </div>
  );
}
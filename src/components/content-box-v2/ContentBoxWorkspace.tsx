import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { FormatPanel } from '../element-look-and-feel/FormatPanel';
import { ImageElement } from './ImageElement';
import { PdfElement } from './PdfElement';
import { ContentElement, ImageElement as ImageElementType, PdfElement as PdfElementType } from './types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with unpkg CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Process PDF file and render all pages to images
const processPdfFile = async (file: File): Promise<{ pageImages: string[], totalPages: number }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const pageImages: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        pageImages.push(canvas.toDataURL('image/png'));
      }
    }

    return { pageImages, totalPages };
  } catch (error) {
    console.error('Error processing PDF:', error);
    // Fallback to placeholder if PDF processing fails
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 560, 400);
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Unable to load PDF', 280, 190);
      ctx.fillText(file.name, 280, 220);
    }
    return {
      pageImages: [canvas.toDataURL('image/png')],
      totalPages: 1
    };
  }
};

export function ContentBoxWorkspace() {
  const [elements, setElements] = useState<ContentElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [interactionInProgress, setInteractionInProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextZIndex = elements.length > 0 
      ? Math.max(...elements.map(el => el.zIndex)) + 1 
      : 1;

    if (file.type.startsWith('image/')) {
      // Handle image file
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const width = Math.min(400, img.width);
          const height = width / aspectRatio;
          
          const newElement: ImageElementType = {
            id: generateId(),
            type: 'image',
            src: event.target?.result as string,
            width,
            height,
            position: { x: 100, y: 100 },
            size: { width, height },
            zIndex: nextZIndex,
            borderColor: 'transparent',
            borderWidth: 0,
            fillColor: 'transparent'
          };
          setElements([...elements, newElement]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // Handle PDF file
      const { pageImages, totalPages } = await processPdfFile(file);
      
      const width = 560;
      const height = 400;
      
      const newElement: PdfElementType = {
        id: generateId(),
        type: 'pdf',
        fileName: file.name,
        currentPage: 1,
        totalPages,
        pdfData: '', // Would store base64 PDF data in real app
        pageImages,
        width,
        height,
        position: { x: 50, y: 50 },
        size: { width, height },
        zIndex: nextZIndex,
        borderColor: 'transparent',
        borderWidth: 0,
        fillColor: 'transparent'
      };
      setElements([...elements, newElement]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const updateElement = (id: string, updates: Partial<ContentElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setShowFormatPanel(false);
    }
  };

  const handleCanvasClick = () => {
    if (!interactionInProgress) {
      setSelectedElementId(null);
      setShowFormatPanel(false);
    }
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header with buttons */}
      <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
        <Button onClick={handleUploadFile} variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Workspace Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-gray-50 overflow-auto"
        onClick={handleCanvasClick}
      >
        {elements.map((element) => {
          if (element.type === 'image') {
            return (
              <ImageElement
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
            );
          } else if (element.type === 'pdf') {
            return (
              <PdfElement
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
            );
          }
          return null;
        })}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

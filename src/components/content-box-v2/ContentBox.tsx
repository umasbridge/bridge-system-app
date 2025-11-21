import { useState, useRef } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { Button } from '../ui/button';
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

export function ContentBox() {
  const [elements, setElements] = useState<ContentElement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
            height
          };
          setElements([...elements, newElement]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // Handle PDF file
      const { pageImages, totalPages } = await processPdfFile(file);
      
      const newElement: PdfElementType = {
        id: generateId(),
        type: 'pdf',
        fileName: file.name,
        currentPage: 1,
        totalPages,
        pdfData: '', // Would store base64 PDF data in real app
        pageImages,
        width: 560, // Slightly less than content box width for padding
        height: 400
      };
      setElements([...elements, newElement]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddImage = () => {
    const newElement: ImageElementType = {
      id: generateId(),
      type: 'image',
      src: null,
      width: 400,
      height: 300
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<ContentElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
  };

  return (
    <div className="w-full">
      {/* Header with buttons */}
      <div className="flex gap-2 mb-4">
        <Button onClick={handleUploadFile} variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
        <Button onClick={handleAddImage} variant="outline" className="gap-2">
          <ImagePlus className="h-4 w-4" />
          Add Image
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex flex-col gap-4 items-start">
        {elements.map((element) => {
          if (element.type === 'image') {
            return (
              <ImageElement
                key={element.id}
                element={element}
                onUpdate={(updates) => updateElement(element.id, updates)}
                onDelete={() => deleteElement(element.id)}
              />
            );
          } else if (element.type === 'pdf') {
            return (
              <PdfElement
                key={element.id}
                element={element}
                onUpdate={(updates) => updateElement(element.id, updates)}
                onDelete={() => deleteElement(element.id)}
              />
            );
          }
          return null;
        })}
      </div>

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

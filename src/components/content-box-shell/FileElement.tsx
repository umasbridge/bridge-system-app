import { useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { FileElement as FileElementType } from './types';
import * as pdfjsLib from 'pdfjs-dist';

interface FileElementProps {
  element: FileElementType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<FileElementType>) => void;
  onDelete: () => void;
}

export function FileElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}: FileElementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertPdfToImage = async (pdfData: Uint8Array, pageNumber: number = 1): Promise<string> => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;
      
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Could not get canvas context');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error converting PDF to image:', error);
      throw error;
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (!element.pdfData || !element.totalPages) return;
    
    if (newPage < 1 || newPage > element.totalPages) return;
    
    try {
      const pdfDataCopy = element.pdfData.slice();
      const imageUrl = await convertPdfToImage(pdfDataCopy, newPage);
      onUpdate({
        imageUrl,
        currentPage: newPage
      });
    } catch (error) {
      console.error('Failed to render PDF page:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer).slice();
        
        const pdfDataCopy1 = pdfData.slice();
        const pdf = await pdfjsLib.getDocument({ data: pdfDataCopy1 }).promise;
        const totalPages = pdf.numPages;
        
        const pdfDataCopy2 = pdfData.slice();
        const imageUrl = await convertPdfToImage(pdfDataCopy2, 1);
        
        onUpdate({
          imageUrl,
          fileName: file.name,
          isPdf: true,
          currentPage: 1,
          totalPages: totalPages,
          pdfData: pdfData
        });
      } catch (error) {
        console.error('Failed to convert PDF:', error);
        alert('Failed to load PDF. Please try another file.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onUpdate({
          imageUrl,
          fileName: file.name,
          isPdf: false,
          currentPage: undefined,
          totalPages: undefined,
          pdfData: undefined
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            onUpdate({
              imageUrl,
              fileName: 'pasted-image.png'
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  return (
    <div
      onClick={onSelect}
      onPaste={handlePaste}
      tabIndex={0}
      className={`w-full rounded relative ${
        element.imageUrl ? '' : 'bg-gray-100 border-2 border-dashed border-gray-300'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      {element.imageUrl ? (
        <div className="relative">
          <img
            src={element.imageUrl}
            alt={element.fileName || 'Uploaded file'}
            className="w-full h-auto max-h-96 object-contain"
          />
          
          {/* PDF Navigation Controls */}
          {element.isPdf && element.totalPages && element.totalPages > 1 && (
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handlePageChange((element.currentPage || 1) - 1)}
                disabled={element.currentPage === 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="text-sm min-w-[60px] text-center">
                {element.currentPage || 1} / {element.totalPages}
              </span>
              <button
                onClick={() => handlePageChange((element.currentPage || 1) + 1)}
                disabled={element.currentPage === element.totalPages}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full text-center p-8 flex flex-col items-center justify-center gap-2 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500">
            Drop image or paste (Cmd/Ctrl+V)
          </p>
          <p className="text-xs text-gray-400">Click to browse</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {isSelected && (
        <div className="absolute -top-2 -right-2 flex gap-1 bg-white border border-gray-300 rounded-full p-1 shadow-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Change Image"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-100 text-red-600 rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

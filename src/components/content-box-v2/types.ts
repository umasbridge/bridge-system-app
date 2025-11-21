// Type definitions for Content Box V2

export type ElementType = 'image' | 'pdf';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ImageElement {
  id: string;
  type: 'image';
  src: string | null;
  width: number;
  height: number;
  position: Position;
  size: Size;
  zIndex: number;
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
}

export interface PdfElement {
  id: string;
  type: 'pdf';
  fileName: string;
  currentPage: number;
  totalPages: number;
  pdfData: string; // base64 encoded PDF
  pageImages: string[]; // array of base64 encoded page images
  width: number;
  height: number;
  position: Position;
  size: Size;
  zIndex: number;
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
}

export type ContentElement = ImageElement | PdfElement;

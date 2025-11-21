// Type definitions for Content Box system

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type ElementType = 'text' | 'link' | 'file';

export interface BaseElement {
  id: string;
  type: ElementType;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
}

export interface LinkElement extends BaseElement {
  type: 'link';
  url: string;
  displayText: string;
}

export interface FileElement extends BaseElement {
  type: 'file';
  imageUrl?: string;
  fileName?: string;
  isPdf?: boolean;
  currentPage?: number;
  totalPages?: number;
  pdfData?: Uint8Array;
}

export type ContentElement = TextElement | LinkElement | FileElement;

export interface ContentBoxProps {
  id: string;
  position: Position;
  size: Size;
  zIndex: number;
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
  elements: ContentElement[];
}

// Type definitions for Insert Image component

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

// Type definitions for the element positioning and styling system

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  position: Position;
  size: Size;
  zIndex: number;
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
  isManuallyPositioned?: boolean; // Track if element was manually moved
}

export interface ElementActions {
  onSelect: () => void;
  onUpdate: (updates: Partial<BaseElement>) => void;
  onDelete: () => void;
  onFormat?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export interface ResizableElementProps {
  element: BaseElement;
  isSelected: boolean;
  actions: ElementActions;
  containerRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  showFormatButton?: boolean;
  minHeight?: number; // Minimum height for manual resize
  [key: string]: any; // Allow additional props to be passed through
}
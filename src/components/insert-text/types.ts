export interface TextElement {
  id: string;
  type: 'text';
  text: string;
  htmlContent?: string; // For rich text formatting
  imageSrc?: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  borderColor: string;
  borderWidth: number;
  fillColor: string;
}

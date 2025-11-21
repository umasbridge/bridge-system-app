export interface EmbeddedBoxElement {
  id: string;
  type: 'embedded-box';
  text: string;
  htmlContent?: string; // For rich text formatting
  imageSrc?: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

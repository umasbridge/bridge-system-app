# Element Look and Feel Module

A reusable system for adding positioning, resizing, and styling capabilities to any element in your application.

## Features

### 1. **Positioning & Sizing**
- Hover-based selection (select icon appears near top-left corner)
- Drag-to-move functionality
- Resize via border dragging (width/height independently)
- Aspect-ratio resizing via bottom-right corner
- Selection persistence (stays selected during interactions)
- Click outside to deselect

### 2. **Visual Formatting**
- **Border Controls**
  - 9 preset colors + custom color picker
  - Border width slider (0-10px)
  - Quick-select buttons (1px, 2px, 4px, 6px)
  - "No Border" option
- **Fill Controls**
  - 9 preset colors + custom color picker
  - "No Fill" option (transparent background)
  - Hex color input

### 3. **Interaction Management**
- Delete with confirmation via undo button
- Undo delete (auto-hides after 2 minutes)
- Format panel for styling
- Proper event propagation handling
- Prevents accidental deselection during resize/drag

## Core Components

### `ResizableElement`
Wraps any content and provides positioning, resizing, and interaction capabilities.

### `FormatPanel`
A floating panel for configuring border and fill properties.

### Types
- `BaseElement` - Core element with position, size, and styling
- `ElementActions` - Callbacks for element interactions
- `ResizableElementProps` - Props for ResizableElement component

## Usage

```tsx
import { ResizableElement, FormatPanel, BaseElement } from './components/element-look-and-feel';

// 1. Define your elements state
const [elements, setElements] = useState<BaseElement[]>([]);
const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
const [formattingElementId, setFormattingElementId] = useState<string | null>(null);

// 2. Create element with default styles
const newElement: BaseElement = {
  id: generateId(),
  position: { x: 50, y: 50 },
  size: { width: 300, height: 200 },
  zIndex: 0,
  borderColor: '#D1D5DB',
  borderWidth: 2,
  fillColor: '#FFFFFF'
};

// 3. Render elements
<ResizableElement
  element={element}
  isSelected={selectedElementId === element.id}
  actions={{
    onSelect: () => setSelectedElementId(element.id),
    onUpdate: (updates) => updateElement(element.id, updates),
    onDelete: () => deleteElement(element.id),
    onFormat: () => setFormattingElementId(element.id),
    onInteractionStart: handleInteractionStart,
    onInteractionEnd: handleInteractionEnd
  }}
  containerRef={containerRef}
  showFormatButton={true}
>
  {/* Your custom content */}
  <div 
    style={{
      backgroundColor: element.fillColor || '#FFFFFF',
      border: element.borderWidth === 0 
        ? 'none' 
        : `${element.borderWidth}px solid ${element.borderColor}`
    }}
  >
    Your content here
  </div>
</ResizableElement>

// 4. Add Format Panel
{formattingElementId && (
  <FormatPanel
    element={elements.find(el => el.id === formattingElementId)!}
    onUpdate={(updates) => updateElement(formattingElementId, updates)}
    onClose={() => setFormattingElementId(null)}
  />
)}
```

## Integration Requirements

### State Management
You need to maintain:
- `elements` - Array of BaseElement objects
- `selectedElementId` - Currently selected element ID
- `formattingElementId` - Element being formatted (optional)
- `isInteracting` - Flag to prevent deselection during drag/resize

### Container Setup
- Parent container needs `ref` and click handler
- Container should have `position: relative`
- Click outside should deselect (unless interacting)

### Interaction Handlers
```tsx
const handleInteractionStart = () => {
  setIsInteracting(true);
  if (interactionTimeoutRef.current) {
    clearTimeout(interactionTimeoutRef.current);
  }
};

const handleInteractionEnd = () => {
  if (interactionTimeoutRef.current) {
    clearTimeout(interactionTimeoutRef.current);
  }
  interactionTimeoutRef.current = setTimeout(() => {
    setIsInteracting(false);
  }, 150);
};
```

## Styling Guidelines

Elements should apply their border and fill styles like this:

```tsx
<div 
  style={{
    backgroundColor: element.fillColor || '#FFFFFF',
    border: element.borderWidth === 0 
      ? 'none' 
      : `${element.borderWidth ?? 2}px solid ${element.borderColor || '#D1D5DB'}`
  }}
>
  Content
</div>
```

## Delete & Undo

Implement undo functionality for accidental deletes:

```tsx
const deleteElement = (id: string) => {
  const elementToDelete = elements.find(el => el.id === id);
  if (!elementToDelete) return;
  
  setDeletedElement(elementToDelete);
  setElements(elements.filter(el => el.id !== id));
  setShowUndo(true);
  
  // Auto-hide after 2 minutes
  undoTimeoutRef.current = setTimeout(() => {
    setShowUndo(false);
    setDeletedElement(null);
  }, 120000);
};

const undoDelete = () => {
  if (deletedElement) {
    setElements([...elements, deletedElement]);
    setDeletedElement(null);
    setShowUndo(false);
  }
};
```

## Usage Guidelines

When implementing workspaces using this module:

1. **Element Creation**:
   - New elements should NOT be auto-selected by default
   - User must manually select element via hover-select icon after creation
   - This provides consistent behavior and prevents unwanted auto-focus

2. **Selection Management**: 
   - Track selected element ID in workspace state
   - Deselect when clicking canvas background (use `interactionInProgress` to prevent deselection during drag/resize)
   - Only one element can be selected at a time

3. **Format Panel Integration**:
   - Show/hide Format Panel based on selection state
   - Pass selected element and update handler to FormatPanel
   - Close panel when element is deselected or deleted

4. **Element Updates**:
   - Elements maintain selection after position/size changes
   - Selection persists through all interactions (drag, resize, format changes)

5. **Canvas Interaction**:
   - Use `interactionInProgress` flag to prevent canvas clicks from deselecting during drag/resize operations

## Best Practices

1. **Always provide unique IDs** for each element
2. **Use containerRef** to ensure proper boundary calculations
3. **Handle interaction state** to prevent deselection bugs
4. **Apply styles inline** using element properties
5. **Validate element existence** before rendering FormatPanel
6. **Clean up timeouts** on component unmount
7. **Do not auto-select new elements** - let users manually select via hover

## Notes

- Border width of 0 removes the border completely
- Fill color of 'transparent' makes background see-through
- Elements remain selectable even when invisible (no border/fill)
- Selection stays active during resize/drag operations
- Format panel auto-closes on Apply
- New elements are not selected by default for consistent UX

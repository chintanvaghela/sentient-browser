export type SemanticRole =
  | 'button'
  | 'link'
  | 'textbox'
  | 'password'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'option'
  | 'heading'
  | 'text'
  | 'image'
  | 'modal'
  | 'dialog'
  | 'form'
  | 'table'
  | 'row'
  | 'cell'
  | 'list'
  | 'listitem'
  | 'navigation'
  | 'region'
  | 'generic';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SemanticNode {
  /** Deterministic, stable identifier across re-renders */
  id: string;

  /** Semantic role of the element */
  role: SemanticRole;

  /** Normalized text content, aria-label, or value */
  text: string;

  /** HTML tag name (e.g. 'button', 'a', 'input') */
  tag: string;

  /** Current value for input/select elements */
  value?: string;

  /** Placeholder text for input fields */
  placeholder?: string;

  /** Whether the element is rendered and not hidden */
  visible: boolean;

  /** Whether the element is enabled (not disabled) */
  enabled: boolean;

  /** Whether the element accepts click events and is not occluded */
  clickable: boolean;

  /** Whether the element currently has keyboard focus */
  focused: boolean;

  /** Checked state for checkboxes and radio buttons */
  checked?: boolean;

  /** Screen coordinates and dimensions */
  bbox: BoundingBox;

  /** Stable ID of the nearest semantic parent container */
  parentId?: string;

  /** Child semantic nodes (hierarchical view) */
  children?: SemanticNode[];
}

export interface SemanticSnapshot {
  url: string;
  title: string;
  timestamp: number;
  nodes: SemanticNode[];
  totalNodes: number;
  interactiveCount: number;
}

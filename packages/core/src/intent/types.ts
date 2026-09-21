export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  timeoutMs?: number;
}

export interface FillOptions {
  clearFirst?: boolean;
  pressEnterAfter?: boolean;
  timeoutMs?: number;
}

export interface ScrollOptions {
  direction?: 'up' | 'down' | 'top' | 'bottom';
  amountPx?: number;
  target?: string;
}

export interface TargetElementInfo {
  found: boolean;
  visible: boolean;
  enabled: boolean;
  clickable: boolean;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type PlannerActionType =
  | 'click'
  | 'fill'
  | 'hover'
  | 'scroll'
  | 'rollback'
  | 'finish';

export interface PlannerStepAction {
  type: PlannerActionType;
  target?: string;
  text?: string;
  direction?: 'up' | 'down' | 'top' | 'bottom';
  answer?: string;
  reasoning?: string;
}

export interface PlannerStep {
  stepNumber: number;
  action: PlannerStepAction;
  diffSummary?: string;
  timestamp: number;
}

export interface PlannerGoal {
  goal: string;
  maxSteps?: number;
  timeoutMs?: number;
  llmCaller?: (prompt: string) => Promise<string>;
  onStep?: (step: PlannerStep) => void;
}

export interface PlannerResult {
  success: boolean;
  goal: string;
  answer?: string;
  stepsCount: number;
  steps: PlannerStep[];
  durationMs: number;
  error?: string;
}

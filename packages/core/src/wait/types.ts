export type SettlementProfile = 'eager' | 'default' | 'strict';

export interface WaitOptions {
  timeoutMs?: number;
  quietWindowMs?: number;
  profile?: SettlementProfile;
}

export interface SettlementStatus {
  settled: boolean;
  inFlightRequests: number;
  recentMutations: number;
  activeAnimations: number;
  elapsedMs: number;
}

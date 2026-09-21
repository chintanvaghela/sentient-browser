export type SettlementProfile = 'eager' | 'default' | 'strict';
export type SettlementScope = 'local' | 'global';

export interface WaitOptions {
  timeoutMs?: number;
  quietWindowMs?: number;
  profile?: SettlementProfile;
  scope?: SettlementScope;
}

export interface SettlementStatus {
  settled: boolean;
  inFlightRequests: number;
  recentMutations: number;
  activeAnimations: number;
  elapsedMs: number;
}

import { ConventionTemplate, SystemTemplate } from './types';
import { stayman1NT } from './stayman_1nt';
import { majorTransfers1NT } from './major_transfers_1nt';
import { twoOverOneBase } from './two_over_one_base';

// Base systems
export const SYSTEMS: SystemTemplate[] = [
  twoOverOneBase,
];

// Individual conventions
export const CONVENTIONS: ConventionTemplate[] = [
  stayman1NT,
  majorTransfers1NT,
];

export function getSystemById(id: string): SystemTemplate | undefined {
  return SYSTEMS.find(s => s.id === id);
}

export function getConventionById(id: string): ConventionTemplate | undefined {
  return CONVENTIONS.find(c => c.id === id);
}

export * from './types';
export { stayman1NT } from './stayman_1nt';
export { majorTransfers1NT } from './major_transfers_1nt';
export { twoOverOneBase } from './two_over_one_base';

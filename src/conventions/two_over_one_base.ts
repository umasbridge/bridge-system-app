import { SystemTemplate } from './types';
import { stayman1NT } from './stayman_1nt';
import { majorTransfers1NT } from './major_transfers_1nt';

// Convention lookup
const conventionMap: Record<string, typeof stayman1NT> = {
  'stayman_1nt': stayman1NT,
  'major_transfers_1nt': majorTransfers1NT,
};

export const twoOverOneBase: SystemTemplate = {
  id: 'two_over_one_base',
  name: '2/1 Base System',
  description: '2/1 Game Force system',

  // Questions about the system itself
  systemOptions: [
    {
      id: 'forcing_1nt_unpassed',
      question: 'Is 1NT over 1M forcing by an Unpassed Hand?',
      default: true
    }
  ],

  // Conventions that can be added to this system
  availableConventions: ['stayman_1nt', 'major_transfers_1nt'],

  generate: (
    systemAnswers: Record<string, boolean>,
    selectedConventions: string[],
    conventionAnswers: Record<string, boolean>
  ): string => {
    const lines: string[] = [];
    const forcing1NT = systemAnswers['forcing_1nt_unpassed'] !== false; // default true

    // Partnership Rules
    lines.push('## Partnership Rules');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 1m Opening
    lines.push('## 1m Opening');
    lines.push('');
    lines.push('### 1c = 3+ clubs, 11-21 HCP');
    lines.push('');
    lines.push('- **1d** = 4+ diamonds, 6+ HCP, forcing');
    lines.push('- **1h** = 4+ hearts, 6+ HCP, forcing');
    lines.push('- **1s** = 4+ spades, 6+ HCP, forcing');
    lines.push('- **1n** = 6-10 HCP, no 4-card major');
    lines.push('- **2n** = 13-15 HCP, balanced, game forcing');
    lines.push('- **3n** = 16-18 HCP, balanced');
    lines.push('');
    lines.push('### 1d = 3+ diamonds, 11-21 HCP');
    lines.push('');
    lines.push('- **1h** = 4+ hearts, 6+ HCP, forcing');
    lines.push('- **1s** = 4+ spades, 6+ HCP, forcing');
    lines.push('- **1n** = 6-10 HCP, no 4-card major');
    lines.push('- **2n** = 13-15 HCP, balanced, game forcing');
    lines.push('- **3n** = 16-18 HCP, balanced');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 1M Opening
    lines.push('## 1M Opening');
    lines.push('');
    lines.push('### 1h = 5+ hearts, 11-21 HCP');
    lines.push('');
    lines.push('- **1s** = 4+ spades, 6+ HCP, forcing');
    if (forcing1NT) {
      lines.push('- **1n** = Forcing 1NT, 6-12 HCP');
    } else {
      lines.push('- **1n** = Non-forcing, 6-10 HCP');
    }
    lines.push('- **2c** = 2/1 Game Force, 5+ clubs, 13+ HCP');
    lines.push('- **2d** = 2/1 Game Force, 5+ diamonds, 13+ HCP');
    lines.push('- **2h** = Simple raise, 3+ hearts, 7-10 points');
    lines.push('- **3h** = Limit raise, 3+ hearts, 10-12 points');
    lines.push('- **4h** = To play');
    lines.push('');
    lines.push('### 1s = 5+ spades, 11-21 HCP');
    lines.push('');
    if (forcing1NT) {
      lines.push('- **1n** = Forcing 1NT, 6-12 HCP');
    } else {
      lines.push('- **1n** = Non-forcing, 6-10 HCP');
    }
    lines.push('- **2c** = 2/1 Game Force, 5+ clubs, 13+ HCP');
    lines.push('- **2d** = 2/1 Game Force, 5+ diamonds, 13+ HCP');
    lines.push('- **2h** = 2/1 Game Force, 5+ hearts, 12+ HCP');
    lines.push('- **2s** = Simple raise, 3+ spades, 7-10 points');
    lines.push('- **3s** = Limit raise, 3+ spades, 10-12 points');
    lines.push('- **4s** = To play');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 1NT Opening
    lines.push('## 1n = 15-17 HCP, balanced');
    lines.push('');

    // Include selected conventions for 1NT
    for (const convId of selectedConventions) {
      const convention = conventionMap[convId];
      if (convention) {
        lines.push(convention.generate(conventionAnswers));
      }
    }

    lines.push('---');
    lines.push('');

    // 2NT Opening
    lines.push('## 2n = 20-21 HCP, balanced');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 2C Opening
    lines.push('## 2c = 22+ HCP, artificial, game forcing');
    lines.push('');
    lines.push('- **2d** = Waiting, artificial');
    lines.push('- **2h** = Positive, 5+ hearts, 8+ points');
    lines.push('- **2s** = Positive, 5+ spades, 8+ points');
    lines.push('- **2n** = Positive, balanced');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Preemptive Openings
    lines.push('## Preemptive Openings');
    lines.push('');
    lines.push('### 2d = Weak, 6+ diamonds, 6-10 HCP');
    lines.push('');
    lines.push('### 2h = Weak, 6+ hearts, 6-10 HCP');
    lines.push('');
    lines.push('### 2s = Weak, 6+ spades, 6-10 HCP');
    lines.push('');
    lines.push('### 3c = Preempt, 7+ clubs');
    lines.push('');
    lines.push('### 3d = Preempt, 7+ diamonds');
    lines.push('');
    lines.push('### 3h = Preempt, 7+ hearts');
    lines.push('');
    lines.push('### 3s = Preempt, 7+ spades');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Competition
    lines.push('## Competition');
    lines.push('');

    return lines.join('\n');
  }
};

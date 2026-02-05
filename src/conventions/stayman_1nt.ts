import { ConventionTemplate } from './types';

export const stayman1NT: ConventionTemplate = {
  id: 'stayman_1nt',
  name: 'Stayman (over 1NT)',
  description: 'Responder bids 2C over 1NT to ask opener for a 4-card major',
  options: [],

  generate: (): string => {
    const lines: string[] = [];

    lines.push('## 1n-(p)-2c = Stayman');
    lines.push('');
    lines.push('- **2d** = No 4-card major');
    lines.push('  - **p** = To play');
    lines.push('  - **2h** = Pass or correct, weak with both majors');
    lines.push('    - **p** = 3 hearts, to play');
    lines.push('    - **2s** = 2 hearts, 3 spades, to play');
    lines.push('  - **2n** = Invitational, no 4-card major');
    lines.push('  - **3c** = 5+ clubs, game forcing');
    lines.push('  - **3d** = 5+ diamonds, game forcing');
    lines.push('  - **3h** = Smolen, 4 hearts + 5 spades, game forcing');
    lines.push('    - **3s** = 3 spades, sets trump');
    lines.push('    - **3n** = No 3 spades, to play');
    lines.push('    - **4s** = 3 spades, minimum');
    lines.push('  - **3s** = Smolen, 4 spades + 5 hearts, game forcing');
    lines.push('    - **3n** = No 3 hearts, to play');
    lines.push('    - **4h** = 3 hearts, minimum');
    lines.push('  - **3n** = Signoff, no major fit');
    lines.push('  - **4n** = Invitational to 6NT');
    lines.push('');
    lines.push('- **2h** = 4+ hearts, may have 4 spades');
    lines.push('  - **p** = To play, weak with hearts');
    lines.push('  - **2s** = Invitational, 4 spades');
    lines.push('    - **2n** = Minimum, no 4 spades');
    lines.push('    - **3h** = Minimum, 4 hearts only');
    lines.push('    - **3s** = 4-4 majors, minimum');
    lines.push('    - **3n** = Maximum, no 4 spades');
    lines.push('    - **4h** = Maximum, 4 hearts only');
    lines.push('    - **4s** = 4-4 majors, maximum');
    lines.push('  - **2n** = Invitational, denies 4 spades');
    lines.push('  - **3c** = 5+ clubs, game forcing');
    lines.push('  - **3d** = 5+ diamonds, game forcing');
    lines.push('  - **3h** = Invitational, 4 hearts');
    lines.push('    - **p** = Minimum');
    lines.push('    - **4h** = Maximum');
    lines.push('  - **3s** = Slam try, 4+ hearts');
    lines.push('  - **3n** = To play, 4 spades (no heart fit)');
    lines.push('  - **4h** = To play, 4+ hearts');
    lines.push('  - **4n** = Invitational to 6NT');
    lines.push('');
    lines.push('- **2s** = 4+ spades, denies 4 hearts');
    lines.push('  - **p** = To play, weak with spades');
    lines.push('  - **2n** = Invitational');
    lines.push('  - **3c** = 5+ clubs, game forcing');
    lines.push('  - **3d** = 5+ diamonds, game forcing');
    lines.push('  - **3h** = Slam try, 4+ spades');
    lines.push('  - **3s** = Invitational, 4 spades');
    lines.push('    - **p** = Minimum');
    lines.push('    - **4s** = Maximum');
    lines.push('  - **3n** = To play, 4 hearts (no spade fit)');
    lines.push('  - **4s** = To play, 4+ spades');
    lines.push('  - **4n** = Invitational to 6NT');
    lines.push('');

    return lines.join('\n');
  }
};

import { ConventionTemplate } from './types';

export const majorTransfers1NT: ConventionTemplate = {
  id: 'major_transfers_1nt',
  name: 'Major Transfers over 1NT',
  description: 'Transfer to Major, 3M is superacceptance with max',

  options: [
    {
      id: 'super_accept_2n_newsuit',
      question: 'Play 2NT and new suit bid by opener as super-accept?',
      default: false
    }
  ],

  generate: (answers: Record<string, boolean>): string => {
    const superAccept = answers['super_accept_2n_newsuit'] || false;
    const lines: string[] = [];

    // Transfer to hearts
    lines.push('## 1n-(p)-2d = Transfer to hearts');
    lines.push('');
    lines.push('- **2h** = Completes transfer');
    lines.push('  - **p** = To play, weak with 5 hearts');
    lines.push('  - **2n** = Invitational, 5 hearts');
    lines.push('  - **3h** = Invitational, 6 hearts');
    lines.push('  - **3n** = Choice of games, 5 hearts');
    lines.push('  - **4h** = To play, 6 hearts');

    if (superAccept) {
      lines.push('- **2s** = Super-accept, 4 hearts, max, short spades');
      lines.push('- **2n** = Super-accept, 4 hearts, max, balanced');
    }

    lines.push('- **3h** = Super-accept, 4 hearts, maximum');
    lines.push('');

    // Transfer to spades
    lines.push('## 1n-(p)-2h = Transfer to spades');
    lines.push('');
    lines.push('- **2s** = Completes transfer');
    lines.push('  - **p** = To play, weak with 5 spades');
    lines.push('  - **2n** = Invitational, 5 spades');
    lines.push('  - **3s** = Invitational, 6 spades');
    lines.push('  - **3n** = Choice of games, 5 spades');
    lines.push('  - **4s** = To play, 6 spades');

    if (superAccept) {
      lines.push('- **2n** = Super-accept, 4 spades, max, balanced');
      lines.push('- **3c** = Super-accept, 4 spades, max, short clubs');
      lines.push('- **3d** = Super-accept, 4 spades, max, short diamonds');
      lines.push('- **3h** = Super-accept, 4 spades, max, short hearts');
    }

    lines.push('- **3s** = Super-accept, 4 spades, maximum');
    lines.push('');

    return lines.join('\n');
  }
};

/**
 * Seed script to create the Fantunes system in the database
 * Run this after logging in to create the complete Fantunes system
 */

import { workspaceOperations, elementOperations, RowData, SystemsTableElement } from '../src/lib/supabase-db';

// Helper to generate unique IDs
const generateId = () => crypto.randomUUID();

// Helper to create a row with children
function row(bid: string, meaning: string, children: RowData[] = []): RowData {
  return {
    id: generateId(),
    bid,
    meaning,
    children,
    collapsed: false,
  };
}

// =====================
// 1C OPENING DATA
// =====================
const opening1cData: RowData[] = [
  row('1c', '14+ HCP, 5+c or 4441 red singleton or 15+ balanced, forcing', []),
];

const responses1cData: RowData[] = [
  row('1d', '0-4 any, or 5-9 with 4+h', [
    row('1h', '4h balanced, or 19+ any', [
      row('1s', '0-4 any, or 5-9 4+s'),
      row('1n', '5-9 no 4M'),
      row('2c', '10+ 5+d (transfer)'),
      row('2d', '10+ 5+h (transfer)'),
      row('2h', '10+ 5+s (transfer)'),
      row('2s', '10+ 5+c (transfer)'),
    ]),
    row('1s', '4s, 14-18'),
    row('1n', '15-17 balanced, no 4M'),
    row('2c', '14-18, 6+c or 5c4d'),
    row('2d', 'GF, any shape', [
      row('2h', 'Relay', [
        row('2s', '3-suited (5-4-4-0 or 4=4=1=4)'),
        row('2n', '23-25 balanced'),
        row('3c', '6+c natural'),
        row('3d', '5c5d'),
        row('3h', '5c4h'),
        row('3s', '5c4s'),
      ]),
    ]),
    row('2h', '5+c 4+h, 14-18'),
    row('2s', '5+c 4+s, 14-18'),
    row('2n', '23-24 balanced'),
    row('3c', '19-22, 6+c solid'),
    row('3n', '25-27 balanced'),
  ]),
  row('1h', '5+ with 4+s, 0-9 (GF if 6+s)', [
    row('1s', '3+s, 14-18', [
      row('Pass', '0-6, content'),
      row('1n', '7-9, no fit'),
      row('2c', '7-9, club preference'),
      row('2s', '7-9, 4s raise'),
    ]),
    row('1n', '15-17 balanced'),
    row('2c', '14-18, 6+c'),
    row('2d', 'GF relay'),
    row('2h', '5+c 4+h, 14-18'),
    row('2s', '4s, 19+ GF'),
    row('2n', '23-24 balanced'),
  ]),
  row('1s', '5-9, no 4M, or 13+ balanced', [
    row('1n', '15-17 balanced'),
    row('2c', '14-18, natural'),
    row('2d', 'GF relay'),
    row('2n', '18-19 balanced'),
  ]),
  row('1n', '10+ unbalanced, 5+d', [
    row('2c', 'Natural, minimum'),
    row('2d', 'Preference'),
    row('2h', '4h, GF'),
    row('2s', '4s, GF'),
    row('2n', '18-19 balanced'),
    row('3d', 'Raise, invitational'),
  ]),
  row('2c', '10+ GF, 5+c', [
    row('2d', 'Relay'),
    row('2n', '18-19 balanced'),
    row('3c', 'Raise'),
  ]),
  row('2d', '10+ GF, 5+h (transfer)', [
    row('2h', '3+h, balanced'),
    row('2s', '4+h, unbalanced'),
    row('2n', 'Balanced, poor h support'),
  ]),
  row('2h', '10+ GF, 5+s (transfer)', [
    row('2s', '3+s, balanced'),
    row('2n', 'Balanced, poor s support'),
    row('3c', '4+s, unbalanced'),
  ]),
  row('2s', '10+ GF, 5+c (transfer)', [
    row('2n', 'Balanced'),
    row('3c', '3+c support'),
  ]),
  row('2n', '10-12 balanced', [
    row('3c', 'Stayman'),
    row('3d', 'Transfer to h'),
    row('3h', 'Transfer to s'),
    row('Pass', 'Content'),
  ]),
  row('3c', '7-9, 6+c'),
  row('3d', 'GF, 5+h 5+m'),
  row('3h', 'GF, 6+h semi-solid'),
  row('3s', 'GF, 6+s semi-solid'),
];

// =====================
// 1D OPENING DATA
// =====================
const opening1dData: RowData[] = [
  row('1d', '14+ HCP, 4+d unbalanced, forcing', []),
];

const responses1dData: RowData[] = [
  row('1h', '0+ with 4+h, may have longer minor', [
    row('1s', '4s, 14-18'),
    row('1n', '15-17 balanced'),
    row('2c', '4+c, 14-20'),
    row('2d', '6+d or 5d4c, 14-20'),
    row('2h', '4h, 14-18 (semi-GF with 19+)'),
    row('2s', '5+d 4s, GF'),
    row('2n', 'GF, various'),
    row('3c', '5+d 5+c, GF'),
    row('3d', '6+d, GF'),
    row('3h', 'Minors with h splinter, GF'),
    row('3s', 'Minors with s splinter, GF'),
  ]),
  row('1s', '0+ with 4+s, may have longer minor', [
    row('1n', '15-17 balanced'),
    row('2c', '4+c, 14-20'),
    row('2d', '6+d or 5d4c, 14-20'),
    row('2h', '5+d 4h, GF'),
    row('2s', '4s, 14-18 (semi-GF with 19+)'),
    row('2n', 'GF, various'),
    row('3c', '5+d 5+c, GF'),
    row('3d', '6+d, GF'),
    row('3h', 'Minors with h splinter, GF'),
    row('3s', 'Minors with s splinter, GF'),
  ]),
  row('1n', '0-8, no 4M', [
    row('Pass', 'Minimum, content'),
    row('2c', '4+c, 14-18'),
    row('2d', '5+d, 14-18'),
    row('2h', '5+d 4h, 19+'),
    row('2s', '5+d 4s, 19+'),
    row('2n', '18-19 balanced'),
  ]),
  row('2c', 'Invitational+, 5+c (may be 4c)', [
    row('2d', 'Preference'),
    row('2n', '18-19 balanced'),
    row('3c', 'Raise'),
  ]),
  row('2d', 'Invitational+, 4+d', [
    row('2n', '18-19 balanced'),
    row('3d', 'Minimum'),
    row('3n', '14-17, stoppers'),
  ]),
  row('2h', 'Invitational, 6+h', [
    row('2s', 'Waiting, GF'),
    row('2n', '18-19 balanced'),
    row('3h', 'Raise'),
    row('4h', 'To play'),
  ]),
  row('2s', 'Invitational, 6+s', [
    row('2n', '18-19 balanced'),
    row('3s', 'Raise'),
    row('4s', 'To play'),
  ]),
  row('2n', '9-10 balanced', [
    row('3c', 'Stayman'),
    row('3n', 'To play'),
  ]),
];

// =====================
// 1H OPENING DATA
// =====================
const opening1hData: RowData[] = [
  row('1h', '14+ HCP (11+ with 5h4s), 5+h, forcing', []),
];

const responses1hData: RowData[] = [
  row('1s', '4+s, 0-9 (longer minor possible)', [
    row('1n', '15-17 balanced'),
    row('2c', '4+c, 14-18', [
      row('2d', 'Checkback'),
      row('2h', 'Preference'),
      row('2s', '6+s, to play'),
      row('2n', 'Invitational'),
    ]),
    row('2d', '4+d, 14-18'),
    row('2h', '6+h, 14-18'),
    row('2s', '4s support, 14-18'),
    row('2n', '5h 4s, 18-19'),
    row('3c', '5+h 5+c, GF'),
    row('3d', '5+h 5+d, GF'),
    row('3h', '6+h, GF'),
    row('3s', '4s, GF'),
  ]),
  row('1n', '0-8, no 4s', [
    row('Pass', 'Minimum, content'),
    row('2c', '4+c, 14-18'),
    row('2d', '4+d, 14-18'),
    row('2h', '6+h, 14-18'),
    row('2n', '18-19 balanced'),
  ]),
  row('2c', 'GF relay', [
    row('2d', '5440 or 4+c'),
    row('2h', '4+d'),
    row('2s', '4s'),
    row('2n', '6+h or 5332'),
    row('3c', '5+h 5+c'),
    row('3d', '5+h 5+d'),
  ]),
  row('2d', 'Invitational+, 4+d', [
    row('2h', '6+h, minimum'),
    row('2n', '18-19 balanced'),
    row('3d', 'Raise'),
  ]),
  row('2h', '7-10, 3+h raise', [
    row('Pass', 'Minimum'),
    row('3h', 'Invitational'),
    row('4h', 'To play'),
  ]),
  row('2s', 'Invitational, 6+s', [
    row('2n', 'Waiting'),
    row('3s', 'Raise'),
    row('4s', 'To play'),
  ]),
  row('2n', '10-12 balanced, 2h', [
    row('3c', 'Checkback'),
    row('3h', '6+h'),
    row('3n', 'To play'),
  ]),
  row('3c', 'Invitational, 6+c'),
  row('3d', 'Invitational, 6+d'),
  row('3h', '10-12, 4+h limit raise'),
  row('4h', 'Weak, 5+h'),
];

// =====================
// 1S OPENING DATA
// =====================
const opening1sData: RowData[] = [
  row('1s', '14+ HCP (11+ with 5s4h), 5+s, forcing', []),
];

const responses1sData: RowData[] = [
  row('1n', '0-8, no 4h (may have 3s)', [
    row('Pass', 'Minimum, content'),
    row('2c', '4+c, 14-18'),
    row('2d', '4+d, 14-18'),
    row('2h', '4+h, 14-18'),
    row('2s', '6+s, 14-18'),
    row('2n', '18-19 balanced'),
  ]),
  row('2c', 'GF relay', [
    row('2d', '5440 or 4+c'),
    row('2h', '4+d'),
    row('2s', '4h'),
    row('2n', '6+s or 5332'),
    row('3c', '5+s 5+c'),
    row('3d', '5+s 5+d'),
    row('3h', '5+s 5+h'),
  ]),
  row('2d', 'Invitational+, 4+d', [
    row('2s', '6+s, minimum'),
    row('2n', '18-19 balanced'),
    row('3d', 'Raise'),
  ]),
  row('2h', 'Invitational+, 5+h', [
    row('2s', '6+s, minimum'),
    row('2n', '18-19 balanced'),
    row('3h', 'Raise'),
    row('4h', 'To play'),
  ]),
  row('2s', '7-10, 3+s raise', [
    row('Pass', 'Minimum'),
    row('3s', 'Invitational'),
    row('4s', 'To play'),
  ]),
  row('2n', '10-12 balanced, 2s', [
    row('3c', 'Checkback'),
    row('3s', '6+s'),
    row('3n', 'To play'),
  ]),
  row('3c', 'Invitational, 6+c'),
  row('3d', 'Invitational, 6+d'),
  row('3h', 'Invitational, 6+h'),
  row('3s', '10-12, 4+s limit raise'),
  row('4s', 'Weak, 5+s'),
];

// =====================
// 1NT OPENING DATA
// =====================
const opening1ntData: RowData[] = [
  row('1n', '12-14 HCP, balanced or semi-balanced (may have 5M or singleton)', []),
];

const responses1ntData: RowData[] = [
  row('2c', 'Stayman (0-5 or GF with 5+/5+)', [
    row('2d', 'No 4M', [
      row('Pass', 'Weak with d'),
      row('2h', 'To play, 5h'),
      row('2s', 'To play, 5s'),
      row('2n', 'Invitational'),
      row('3c', 'To play'),
      row('3h', '5-5 majors, non-forcing invite'),
      row('3s', 'Single-suited game try'),
      row('3n', 'To play'),
    ]),
    row('2h', '4h (may have 4s), bids 5M first', [
      row('2s', 'Forcing, 5s'),
      row('2n', 'Invitational'),
      row('3h', 'Invitational, 3h'),
      row('4h', 'To play'),
    ]),
    row('2s', '4s, denies 4h', [
      row('2n', 'Invitational'),
      row('3s', 'Invitational, 3s'),
      row('4s', 'To play'),
    ]),
  ]),
  row('2d', 'Transfer to h (0-5 or GF)', [
    row('2h', 'Completes transfer', [
      row('Pass', 'Weak'),
      row('2s', 'GF, 4s (5-4)'),
      row('2n', 'Invitational, 5h'),
      row('3c', 'GF, 5+h 4+c'),
      row('3d', 'GF, 5+h 4+d'),
      row('3h', 'Invitational, 6h'),
      row('3n', 'Choice of games'),
      row('4h', 'To play'),
    ]),
    row('2s', 'Super-accept, 4h max, short s'),
    row('2n', 'Super-accept, 4h max, balanced'),
    row('3h', 'Super-accept, 4h max'),
  ]),
  row('2h', 'Transfer to s (0-5 or GF)', [
    row('2s', 'Completes transfer', [
      row('Pass', 'Weak'),
      row('2n', 'Invitational, 5s'),
      row('3c', 'GF, 5+s 4+c'),
      row('3d', 'GF, 5+s 4+d'),
      row('3h', 'GF, 5+s 5+h'),
      row('3s', 'Invitational, 6s'),
      row('3n', 'Choice of games'),
      row('4s', 'To play'),
    ]),
    row('2n', 'Super-accept, 4s max, balanced'),
    row('3c', 'Super-accept, 4s max, short c'),
    row('3s', 'Super-accept, 4s max'),
  ]),
  row('2s', 'Range finder, invitational without 4M or slam interest', [
    row('2n', 'Minimum'),
    row('3n', 'Maximum'),
  ]),
  row('2n', '5-card Stayman, GF', [
    row('3c', 'No 5M'),
    row('3d', '(54)22 in majors'),
    row('3h', '5s'),
    row('3s', '5h'),
  ]),
  row('3c', 'Both minors (0-5)', [
    row('Pass', 'c preference'),
    row('3d', 'd preference'),
  ]),
  row('3d', 'Both minors (minimum GF, 9+)', [
    row('3h', 'Cue, c fit'),
    row('3s', 'Cue, d fit'),
    row('3n', 'To play'),
  ]),
  row('3h', 'Minimum GF, 3h, 0-1s'),
  row('3s', 'Minimum GF, 3s, 0-1h'),
  row('4c', 'Gerber'),
  row('4d', 'Transfer to h, to play'),
  row('4h', 'Transfer to s, to play'),
];

// =====================
// 2C OPENING DATA
// =====================
const opening2cData: RowData[] = [
  row('2c', '10-13 HCP, 5+c, unbalanced (6+c OR shortage, not 5332/5422)', []),
];

const responses2cData: RowData[] = [
  row('2d', 'Strong relay, GF (shape ask)', [
    row('2h', '3+h (looking for 5-3 fit)', [
      row('2s', 'Relay', [
        row('2n', '4h'),
        row('3c', '3h, minimum'),
        row('3d', '3h, maximum'),
      ]),
    ]),
    row('2s', '3+s'),
    row('2n', 'No 3-card major, minimum'),
    row('3c', 'No 3-card major, maximum'),
    row('3d', '5+c 5+d'),
    row('3h', '5+c 4h, max'),
    row('3s', '5+c 4s, max'),
  ]),
  row('2h', 'Constructive, 8-11, 4+h (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2s', '4s, looking for better fit'),
    row('2n', 'Good hand, no h fit (3-card raise)'),
    row('3c', '6+c, minimum'),
    row('3h', '3h support, maximum'),
    row('4h', '4h support, maximum'),
  ]),
  row('2s', 'Constructive, 8-11, 4+s (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2n', 'Good hand, no s fit'),
    row('3c', '6+c, minimum'),
    row('3s', '3s support, maximum'),
    row('4s', '4s support, maximum'),
  ]),
  row('2n', 'Invitational, balanced', [
    row('Pass', 'Minimum'),
    row('3c', 'Sign-off'),
    row('3n', 'Accept'),
  ]),
  row('3c', 'Preemptive raise'),
  row('3d', 'Natural, invitational'),
  row('3h', 'Natural, invitational'),
  row('3s', 'Natural, invitational'),
];

// =====================
// 2D OPENING DATA
// =====================
const opening2dData: RowData[] = [
  row('2d', '10-13 HCP, 5+d, unbalanced (6+d OR shortage, not 5332/5422)', []),
];

const responses2dData: RowData[] = [
  row('2h', 'Constructive, 4+h (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2s', '4s'),
    row('2n', 'Good hand, no h fit (or 3h raise)'),
    row('3d', '6+d, minimum'),
    row('3h', '3h support, maximum'),
    row('4h', '4h support, maximum'),
  ]),
  row('2s', 'Constructive, 4+s (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2n', 'Good hand, no s fit (or 3s raise)'),
    row('3d', '6+d, minimum'),
    row('3s', '3s support, maximum'),
    row('4s', '4s support, maximum'),
  ]),
  row('2n', 'Positive relay, GF', [
    row('3c', '5+d 4+c'),
    row('3d', '6+d, minimum'),
    row('3h', '5+d 4h'),
    row('3s', '5+d 4s'),
    row('3n', '6+d, maximum, no 4M'),
  ]),
  row('3c', 'Natural, invitational'),
  row('3d', 'Preemptive raise'),
  row('3h', 'Natural, invitational'),
  row('3s', 'Natural, invitational'),
];

// =====================
// 2H OPENING DATA
// =====================
const opening2hData: RowData[] = [
  row('2h', '10-13 HCP, 5+h, unbalanced (6+h OR shortage, not 5332/5422)', []),
];

const responses2hData: RowData[] = [
  row('2s', 'Constructive, 4+s (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2n', 'Good hand, no s fit'),
    row('3c', '5+h 4+c'),
    row('3d', '5+h 4+d'),
    row('3h', '6+h, minimum'),
    row('3s', '3s support, maximum'),
    row('4s', '4s support, maximum'),
  ]),
  row('2n', 'Positive relay, GF', [
    row('3c', '5+h 4+c'),
    row('3d', '5+h 4+d'),
    row('3h', '6+h, minimum'),
    row('3s', '5+h 4s'),
    row('3n', '6+h, maximum, no second suit'),
  ]),
  row('3c', 'Natural, invitational'),
  row('3d', 'Natural, invitational'),
  row('3h', 'Preemptive raise'),
  row('4h', 'To play'),
];

// =====================
// 2S OPENING DATA
// =====================
const opening2sData: RowData[] = [
  row('2s', '10-13 HCP, 5+s, unbalanced (6+s OR shortage, not 5332/5422)', []),
];

const responses2sData: RowData[] = [
  row('2n', 'Positive relay, GF', [
    row('3c', '5+s 4+c'),
    row('3d', '5+s 4+d'),
    row('3h', '5+s 4+h'),
    row('3s', '6+s, minimum'),
    row('3n', '6+s, maximum, no second suit'),
  ]),
  row('3c', 'Natural, invitational'),
  row('3d', 'Natural, invitational'),
  row('3h', 'Natural, invitational'),
  row('3s', 'Preemptive raise'),
  row('4s', 'To play'),
];

// =====================
// 2NT OPENING DATA
// =====================
const opening2ntData: RowData[] = [
  row('2n', '20-21 HCP, balanced', []),
];

const responses2ntData: RowData[] = [
  row('3c', 'Puppet Stayman', [
    row('3d', 'No 5M, may have 4M', [
      row('3h', '4s (asks for 4h)'),
      row('3s', '4h (asks for 4s)'),
      row('3n', 'No 4M'),
    ]),
    row('3h', '5h'),
    row('3s', '5s'),
  ]),
  row('3d', 'Transfer to h'),
  row('3h', 'Transfer to s'),
  row('3s', 'Minor suit Stayman'),
  row('4c', 'Gerber'),
  row('4n', 'Quantitative'),
];

// =====================
// PREEMPTS DATA
// =====================
const preemptsData: RowData[] = [
  row('3c', 'Preempt, 7+c'),
  row('3d', 'Preempt, 7+d'),
  row('3h', 'Preempt, 7+h'),
  row('3s', 'Preempt, 7+s'),
];

// =====================
// COMPETITIVE BIDDING DATA
// =====================
const competitiveData: RowData[] = [
  row('Overcalls', '', [
    row('1-level', '6+ HCP, 5+ card suit, natural'),
    row('2-level', '10+ HCP, 5+ card suit, natural'),
  ]),
  row('Responses to Overcalls', '', [
    row('New suit', 'Natural, non-forcing'),
    row('Cue bid', 'Limit raise or better'),
    row('Jump raise', 'Preemptive'),
  ]),
  row('Takeout Doubles', '', [
    row('Standard', '11+ HCP, support for unbid suits'),
    row('Strong', '17+ HCP any shape'),
  ]),
  row('After Opponent Overcalls', '', [
    row('Double', 'Negative, values'),
    row('New suit', 'Natural, forcing'),
    row('Cue bid', 'Limit raise or better'),
  ]),
  row('After Opponent Doubles', '', [
    row('Redouble', '10+ HCP, no fit'),
    row('New suit', 'Natural, non-forcing'),
    row('Raise', 'Preemptive'),
  ]),
];

// =====================
// SLAM BIDDING DATA
// =====================
const slamBiddingData: RowData[] = [
  row('RKC Blackwood (1430)', '', [
    row('4n', 'RKC for agreed suit', [
      row('5c', '1 or 4 keycards'),
      row('5d', '0 or 3 keycards'),
      row('5h', '2 keycards, no trump Q'),
      row('5s', '2 keycards, with trump Q'),
    ]),
  ]),
  row('Control Cue Bidding', 'Italian style: 1st OR 2nd round controls', [
    row('Bid up the line', 'Shows control in that suit'),
    row('Skip a suit', 'Denies control'),
    row('4n after cues', 'RKC'),
  ]),
  row('Exclusion Blackwood', '', [
    row('Jump to 5-level', 'Void, asking for keycards excluding that suit'),
  ]),
];

// =====================
// MAIN SEED FUNCTION
// =====================
export async function seedFantunes(): Promise<string> {
  console.log('Creating Fantunes system...');

  // Create main system workspace
  const mainWorkspace = await workspaceOperations.create('Fantunes', 'bidding_system');
  console.log('Created main workspace:', mainWorkspace.id);

  // Helper to create a section (linked workspace with table)
  async function createSection(
    title: string,
    openingData: RowData[],
    responsesData: RowData[],
    yPosition: number
  ): Promise<void> {
    // Create linked workspace
    const linkedWorkspace = await workspaceOperations.create(
      `Fantunes_${title}`,
      'user_defined',
      mainWorkspace.id
    );
    console.log(`Created section: ${title}`, linkedWorkspace.id);

    // Create opening table element
    if (openingData.length > 0) {
      const openingElement: SystemsTableElement = {
        id: generateId(),
        workspaceId: linkedWorkspace.id,
        type: 'systems-table',
        position: { x: 20, y: 20 },
        size: { width: 700, height: 60 },
        zIndex: 0,
        initialRows: openingData,
        showName: true,
        nameHtmlContent: `<b>${title}</b>`,
        gridlines: {
          enabled: true,
          color: '#e5e7eb',
          width: 1,
          style: 'solid',
        },
      };
      await elementOperations.create(openingElement);
    }

    // Create responses table element
    if (responsesData.length > 0) {
      const responsesElement: SystemsTableElement = {
        id: generateId(),
        workspaceId: linkedWorkspace.id,
        type: 'systems-table',
        position: { x: 20, y: 100 },
        size: { width: 700, height: 400 },
        zIndex: 1,
        initialRows: responsesData,
        showName: true,
        nameHtmlContent: '<b>Responses</b>',
        gridlines: {
          enabled: true,
          color: '#e5e7eb',
          width: 1,
          style: 'solid',
        },
      };
      await elementOperations.create(responsesElement);
    }
  }

  // Create sections
  await createSection('1c Opening', opening1cData, responses1cData, 0);
  await createSection('1d Opening', opening1dData, responses1dData, 0);
  await createSection('1h Opening', opening1hData, responses1hData, 0);
  await createSection('1s Opening', opening1sData, responses1sData, 0);
  await createSection('1NT Opening', opening1ntData, responses1ntData, 0);
  await createSection('2c Opening', opening2cData, responses2cData, 0);
  await createSection('2d Opening', opening2dData, responses2dData, 0);
  await createSection('2h Opening', opening2hData, responses2hData, 0);
  await createSection('2s Opening', opening2sData, responses2sData, 0);
  await createSection('2NT Opening', opening2ntData, responses2ntData, 0);
  await createSection('Preempts', preemptsData, [], 0);
  await createSection('Competitive Bidding', competitiveData, [], 0);
  await createSection('Slam Bidding', slamBiddingData, [], 0);

  // Create TOC table in main workspace
  const tocData: RowData[] = [
    row('1c', '14+ HCP, 5+c or 4441 or 15+ bal, forcing'),
    row('1d', '14+ HCP, 4+d unbalanced, forcing'),
    row('1h', '14+ HCP (11+ with 5h4s), 5+h, forcing'),
    row('1s', '14+ HCP (11+ with 5s4h), 5+s, forcing'),
    row('1n', '12-14 HCP, balanced (may have 5M/singleton)'),
    row('2c', '10-13 HCP, 5+c, unbalanced'),
    row('2d', '10-13 HCP, 5+d, unbalanced'),
    row('2h', '10-13 HCP, 5+h, unbalanced'),
    row('2s', '10-13 HCP, 5+s, unbalanced'),
    row('2n', '20-21 HCP, balanced'),
    row('3x', 'Preemptive'),
  ];

  const tocElement: SystemsTableElement = {
    id: generateId(),
    workspaceId: mainWorkspace.id,
    type: 'systems-table',
    position: { x: 20, y: 20 },
    size: { width: 700, height: 400 },
    zIndex: 0,
    initialRows: tocData,
    showName: true,
    nameHtmlContent: '<b>Fantunes - Opening Bids Summary</b>',
    gridlines: {
      enabled: true,
      color: '#e5e7eb',
      width: 1,
      style: 'solid',
    },
  };
  await elementOperations.create(tocElement);

  console.log('Fantunes system created successfully!');
  return mainWorkspace.id;
}

// Export for use in browser console or component
export default seedFantunes;

/**
 * Seed function to create the Fantunes system in the database
 */

import { workspaceOperations, elementOperations, RowData, SystemsTableElement, TextElement } from './supabase-db';

// Helper to generate unique IDs
const generateId = () => crypto.randomUUID();

// System description text
const FANTUNES_DESCRIPTION = `Natural bidding system developed by Carlos Mosca, popularized by Fulvio Fantoni and Claudio Nunes. Features strong (14+) forcing 1-level suit openings and constructive (10-13) 2-level openings. The 1NT opening is weak (12-14) and can include 5-card majors or singletons.`;

// Competitive Bidding content
const COMPETITIVE_BIDDING_CONTENT = `<div style="font-family: inherit; font-size: 14px;">
<h3 style="font-weight: bold; margin-bottom: 12px;">Overcalls</h3>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li><b>1-level</b> = 6+ HCP, 5+ card suit, natural</li>
<li><b>2-level</b> = 10+ HCP, 5+ card suit, natural</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">Responses to Overcalls</h3>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li>New suit = Natural, non-forcing</li>
<li>Cue bid = Limit raise or better</li>
<li>Jump raise = Preemptive</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">Takeout Doubles</h3>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li>11+ HCP, support for unbid suits</li>
<li>Or 17+ HCP any shape</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">After Opponent Overcalls (over our 1-level forcing opening)</h3>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li>Double = Negative, values</li>
<li>New suit = Natural, forcing (opener's bid was forcing)</li>
<li>Cue bid = Limit raise or better</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">After Opponent Doubles (over our 1-level forcing opening)</h3>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li>Redouble = 10+ HCP, no fit</li>
<li>New suit = Natural, non-forcing</li>
<li>Raise = Preemptive</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">2-Level Opener in Competition</h3>
<p style="margin-bottom: 8px;">Unlike standard weak twos, the 2-level opener can act again:</p>
<ul style="margin-left: 20px;">
<li>Rebid suit = 6+ cards</li>
<li>Bid second suit = Natural</li>
<li>Double = Takeout/cooperative</li>
</ul>
</div>`;

// Slam Bidding content
const SLAM_BIDDING_CONTENT = `<div style="font-family: inherit; font-size: 14px;">
<h3 style="font-weight: bold; margin-bottom: 12px;">Roman Key Card Blackwood (1430)</h3>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li><b>4NT</b> = RKC for agreed suit</li>
<li style="margin-left: 20px;"><b>5♣</b> = 1 or 4 keycards</li>
<li style="margin-left: 20px;"><b>5♦</b> = 0 or 3 keycards</li>
<li style="margin-left: 20px;"><b>5♥</b> = 2 keycards, no trump Q</li>
<li style="margin-left: 20px;"><b>5♠</b> = 2 keycards, with trump Q</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">Control Cue Bidding</h3>
<p style="margin-bottom: 8px;">Italian style: Show first OR second round controls (Ace, King, void, singleton)</p>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li>Bid controls up the line</li>
<li>Skip a suit = denies control in that suit</li>
<li>4NT = RKC after controls shown</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">Exclusion Blackwood</h3>
<p>Jump to 5-level in a new suit = Void, asking for keycards excluding that suit</p>
</div>`;

// Special Notes content
const SPECIAL_NOTES_CONTENT = `<div style="font-family: inherit; font-size: 14px;">
<h3 style="font-weight: bold; margin-bottom: 12px;">Third Seat Openings</h3>
<p style="margin-bottom: 16px;">2-level openings can be lighter in third seat: 6-13 HCP acceptable. Greater tactical flexibility.</p>

<h3 style="font-weight: bold; margin-bottom: 12px;">Passed Hand Responses</h3>
<p style="margin-bottom: 8px;">After partner passes, responses can be lighter:</p>
<ul style="margin-left: 20px; margin-bottom: 16px;">
<li>1-level suit openings still forcing for one round</li>
<li>2-level openings same as unpassed</li>
</ul>

<h3 style="font-weight: bold; margin-bottom: 12px;">Partnership Agreements</h3>
<p style="margin-bottom: 8px;">Key decisions to make:</p>
<ol style="margin-left: 20px;">
<li>Super-accepts over 1NT transfers: 2NT/new suit vs jump only</li>
<li>2♠ as relay over 2♥ opening vs 2NT relay</li>
<li>Checkback style after 1X-1Y-2♣/2♦</li>
</ol>
</div>`;

// Helper to create hyperlink HTML (same format as RichTextCell.applyHyperlink)
function createHyperlinkHtml(displayText: string, targetWorkspaceTitle: string): string {
  return `<a href="#" data-workspace="${targetWorkspaceTitle}" data-link-type="split-view" class="text-green-600 underline cursor-pointer hover:text-green-800">${displayText}</a>`;
}

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

// Helper to create a TOC row with hyperlink
function tocRow(bid: string, meaning: string, targetWorkspaceTitle: string): RowData {
  return {
    id: generateId(),
    bid,
    bidHtmlContent: createHyperlinkHtml(bid, targetWorkspaceTitle),
    meaning,
    children: [],
    collapsed: false,
  };
}

// =====================
// 1C OPENING DATA
// =====================
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
  row('2s', 'Range finder, invitational without 4M', [
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
    row('2n', 'Good hand, no h fit'),
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
const responses2dData: RowData[] = [
  row('2h', 'Constructive, 4+h (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2s', '4s'),
    row('2n', 'Good hand, no h fit'),
    row('3d', '6+d, minimum'),
    row('3h', '3h support, maximum'),
    row('4h', '4h support, maximum'),
  ]),
  row('2s', 'Constructive, 4+s (non-forcing)', [
    row('Pass', 'No fit, minimum'),
    row('2n', 'Good hand, no s fit'),
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
    openingBid: string,
    openingMeaning: string,
    responsesData: RowData[]
  ): Promise<void> {
    // Create linked workspace
    const linkedWorkspace = await workspaceOperations.create(
      `Fantunes_${title}`,
      'user_defined',
      mainWorkspace.id
    );
    console.log(`Created section: ${title}`, linkedWorkspace.id);

    // Combine opening + responses into single table
    const tableData: RowData[] = [
      row(openingBid, openingMeaning, responsesData),
    ];

    // Create table element
    const tableElement: SystemsTableElement = {
      id: generateId(),
      workspaceId: linkedWorkspace.id,
      type: 'systems-table',
      position: { x: 20, y: 20 },
      size: { width: 750, height: 600 },
      zIndex: 0,
      initialRows: tableData,
      showName: true,
      nameHtmlContent: `<b>${title}</b>`,
      gridlines: {
        enabled: true,
        color: '#e5e7eb',
        width: 1,
        style: 'solid',
      },
    };
    await elementOperations.create(tableElement);
  }

  // Create sections
  await createSection('1c Opening', '1c', '14+ HCP, 5+c or 4441 or 15+ bal, forcing', responses1cData);
  await createSection('1d Opening', '1d', '14+ HCP, 4+d unbalanced, forcing', responses1dData);
  await createSection('1h Opening', '1h', '14+ HCP (11+ with 5h4s), 5+h, forcing', responses1hData);
  await createSection('1s Opening', '1s', '14+ HCP (11+ with 5s4h), 5+s, forcing', responses1sData);
  await createSection('1NT Opening', '1n', '12-14 HCP, balanced (may have 5M/singleton)', responses1ntData);
  await createSection('2c Opening', '2c', '10-13 HCP, 5+c, unbalanced', responses2cData);
  await createSection('2d Opening', '2d', '10-13 HCP, 5+d, unbalanced', responses2dData);
  await createSection('2h Opening', '2h', '10-13 HCP, 5+h, unbalanced', responses2hData);
  await createSection('2s Opening', '2s', '10-13 HCP, 5+s, unbalanced', responses2sData);
  await createSection('2NT Opening', '2n', '20-21 HCP, balanced', responses2ntData);

  // Helper to create a text section (linked workspace with text element)
  async function createTextSection(
    title: string,
    htmlContent: string
  ): Promise<void> {
    // Create linked workspace
    const linkedWorkspace = await workspaceOperations.create(
      `Fantunes_${title}`,
      'user_defined',
      mainWorkspace.id
    );
    console.log(`Created text section: ${title}`, linkedWorkspace.id);

    // Create text element
    const textElement: TextElement = {
      id: generateId(),
      workspaceId: linkedWorkspace.id,
      type: 'text',
      position: { x: 20, y: 20 },
      size: { width: 700, height: 400 },
      zIndex: 0,
      htmlContent,
    };
    await elementOperations.create(textElement);
  }

  // Create text sections for Competitive Bidding, Slam Bidding, and Special Notes
  await createTextSection('Competitive Bidding', COMPETITIVE_BIDDING_CONTENT);
  await createTextSection('Slam Bidding', SLAM_BIDDING_CONTENT);
  await createTextSection('Special Notes', SPECIAL_NOTES_CONTENT);

  // Create description text element before the TOC
  const descriptionElement: TextElement = {
    id: generateId(),
    workspaceId: mainWorkspace.id,
    type: 'text',
    position: { x: 50, y: 50 },
    size: { width: 500, height: 80 },
    zIndex: 0,
    htmlContent: `<div style="font-size: 14px; line-height: 1.5;">${FANTUNES_DESCRIPTION}</div>`,
  };
  await elementOperations.create(descriptionElement);

  // Create TOC table in main workspace with hyperlinked bids
  const tocData: RowData[] = [
    tocRow('1c', '14+ HCP, 5+c or 4441 or 15+ bal, forcing', 'Fantunes_1c Opening'),
    tocRow('1d', '14+ HCP, 4+d unbalanced, forcing', 'Fantunes_1d Opening'),
    tocRow('1h', '14+ HCP (11+ with 5h4s), 5+h, forcing', 'Fantunes_1h Opening'),
    tocRow('1s', '14+ HCP (11+ with 5s4h), 5+s, forcing', 'Fantunes_1s Opening'),
    tocRow('1n', '12-14 HCP, balanced (may have 5M/singleton)', 'Fantunes_1NT Opening'),
    tocRow('2c', '10-13 HCP, 5+c, unbalanced', 'Fantunes_2c Opening'),
    tocRow('2d', '10-13 HCP, 5+d, unbalanced', 'Fantunes_2d Opening'),
    tocRow('2h', '10-13 HCP, 5+h, unbalanced', 'Fantunes_2h Opening'),
    tocRow('2s', '10-13 HCP, 5+s, unbalanced', 'Fantunes_2s Opening'),
    tocRow('2n', '20-21 HCP, balanced', 'Fantunes_2NT Opening'),
    row('3x', 'Preemptive, 7+ cards'), // No linked workspace for preempts
  ];

  // Add section headers for non-opening content
  const sectionHeaderRow = (label: string, targetWorkspaceTitle: string): RowData => ({
    id: generateId(),
    bid: '',
    meaning: '',
    meaningHtmlContent: createHyperlinkHtml(`<b>${label}</b>`, targetWorkspaceTitle),
    children: [],
    collapsed: false,
    isMerged: true,
  });

  tocData.push(sectionHeaderRow('Competitive Bidding', 'Fantunes_Competitive Bidding'));
  tocData.push(sectionHeaderRow('Slam Bidding', 'Fantunes_Slam Bidding'));
  tocData.push(sectionHeaderRow('Special Notes', 'Fantunes_Special Notes'));

  const tocElement: SystemsTableElement = {
    id: generateId(),
    workspaceId: mainWorkspace.id,
    type: 'systems-table',
    name: 'Fantunes_TOC',
    position: { x: 50, y: 150 },
    size: { width: 500, height: 520 },
    zIndex: 1,
    initialRows: tocData,
    showName: true,
    nameHtmlContent: '<span style="font-weight: 700">Opening Bids Summary</span>',
    meaningWidth: 500,
    levelWidths: { 0: 80 },
    gridlines: { enabled: false, color: '#D1D5DB', width: 1 },
  };
  await elementOperations.create(tocElement);

  // Update workspace canvasWidth for button bar visibility
  await workspaceOperations.update(mainWorkspace.id, {
    canvasWidth: 600,
    canvasHeight: 750,
    titleHtmlContent: '<span style="font-weight: 700">Fantunes</span>'
  });

  console.log('Fantunes system created successfully!');
  return mainWorkspace.id;
}

export default seedFantunes;

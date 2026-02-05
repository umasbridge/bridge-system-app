# Uma + MJR System - Normalized for Parsing

**Source:** System Notes - Uma + MJR, Dec 2025
**Format:** Full unambiguous sequences with explicit passes and opponent markers

---

## Notation

- Bids in parentheses `(x)` = opponent's bid
- `p` = pass
- `x` = double, `xx` = redouble
- Sequences shown from dealer's perspective, all positions filled
- Pattern variables expanded: `1M` → separate entries for `1H` and `1S`
- `→` separates sequence from meaning
- `[context]` notes special conditions (PH, vulnerability, etc.)

---

## 1. General Agreements

These are meta-rules that apply across multiple sequences.

### 1.1 Splinters in Competition
```
RULE: In competition, splinter only in enemy suit
EXCEPTION: Cue raise followed by jump in new suit = splinter
```

### 1.2 Exploring Game in NT
```
RULE: When 2-3 suits unbid, bidding unbid suit = shows cards in that suit
RULE: When 1 suit unbid, bidding that suit at 3-level = stopper ask
RULE: 3-level bid of enemy suit = GF (stopper ask OR support for partner OR long own suit)
```

### 1.3 Fit-Showing Jumps (FSJ) in Competition
```
RULE: In competition, jumps are fit-showing
RULE: FSJ forcing up to cheapest bid of opener's suit
EXCEPTION: 1m-(x)-2M = NF
RULE: All 4-level new suit bids (even without jump by UPH) = support + cards in bid suit
```

---

## 2. Slam Bidding

### 2.1 Serious/Non-Serious 3NT
```
RULE: Non-serious 3NT and serious cues
RULE: [Hearts as trumps] 3S = non-serious, 3NT = spade cue
```

### 2.2 RKC Responses
```
RULE: 4m (Minorwood), 4NT, 5NT responses = 1430
RULE: EKC responses = 0314
```

### 2.3 Queen Ask (after RKC response)
```
RULE: Next step (never NT) = Queen ask
RESPONSE: Cheapest signoff = no Queen
RESPONSE: NT bid = Queen + 0 or 2 Kings
RESPONSE: New suit below 6 of agreed suit = that King (or not that King + Queen)
```

### 2.4 King Ask
```
RULE: Cheapest NT after RKC = King ask
RESPONSE: Signoff = 0 Kings
RESPONSE: NT = 3 Kings
RESPONSE: New suit = that King or not that King
```

### 2.5 Void Showing
```
RULE: Over 4NT, 5NT = void with even KC
RULE: 6x (x < agreed suit) = void in x with 1 or 3 KC
RULE: 6 of agreed suit = void in higher suit with 1 or 3 KC
RULE: Don't show void if 0 or 1 KC
```

### 2.6 Quantitative 4NT
```
RULE: 4NT = quantitative (NF) when no fit established and 3NT available
```

### 2.7 Minorwood Conditions
```
RULE: Minorwood applies only when minor agreed below 3NT and GF established
RULE: 4C or 4D used for suit-setting = NOT RKC
```

### 2.8 EKC Trigger
```
RULE: Jump bid beyond game level of agreed suit = EKC (trump not in doubt)
```

### 2.9 When 4NT Unavailable
```
RULE: When 4NT not available, 5NT = RKC
```

### 2.10 4NT to Play
```
SEQUENCE: 2n-(p)-3s-(p)-3n-(p)-4c-(p)-4n → to play (unsuccessful fit attempt at 4-level)
```

### 2.11 Interference over RKC
```
RULE: [Interference < 5 of suit] DOPI: X/XX = 1 or 4, P = 0 or 3, 1st step = 2 - Q, 2nd step = 2 + Q
RULE: [Interference ≥ 5 of suit] DOPE: X/XX = odd KC, P = even KC, 1st step = 2 + Q
RULE: [Our artificial bid doubled] Pass = worry, XX = 1st round control, rest same
```

---

## 3. 1C Opening

**Context:** We open 1C (longer minor; with 4-4 open 1C)

### 3.1 Responses to 1C

```
1c-(p)-1d → 4+ diamonds, no 4M unless 5+D and GF | [can be 3D if 5-7 HCP and 3334]
1c-(p)-1h → 4+ hearts, forcing
1c-(p)-1s → 4+ spades, forcing
1c-(p)-1n → 8-10 HCP, denies 4M
1c-(p)-2c → inverted minor, GF
1c-(p)-2d → 6+ diamonds, invitational, denies 4M
1c-(p)-2h → 5S-4H or 5-5 or 6-5 majors, good 7 to bad 9 HCP
1c-(p)-2s → 5+ clubs, limit raise
1c-(p)-2n → 10-11 HCP balanced
1c-(p)-3c → preemptive raise, 5-6 HCP
1c-(p)-3d → splinter (diamond shortness), 12-14 or 18+, denies 4M
1c-(p)-3h → splinter (heart shortness), 12-14 or 18+, denies 4M
1c-(p)-3s → splinter (spade shortness), 12-14 or 18+, denies 4M
1c-(p)-3n → 12-14 HCP, no 4M
1c-(p)-4c → splinter (diamond shortness), 12-14 or 18+, denies 4M [double jump]
```

### 3.2 After 1C-1D (responder bid diamonds)

```
1c-(p)-1d-(p)-1n → 12-14 balanced, does NOT deny 4M
1c-(p)-1d-(p)-1h → 4+ hearts
1c-(p)-1d-(p)-1s → 4+ spades
```

### 3.3 After 1C-1N (8-10 response)

```
XYZ applies over 1C-1y-1z and 1C-1y-1N sequences
```

### 3.4 After 1C-2H (majors, weak)

```
1c-(p)-2h-(p)-2s → NF, preference to spades
1c-(p)-2h-(p)-2n → asks distribution
1c-(p)-2h-(p)-2n-(p)-3c → 5-4 min
1c-(p)-2h-(p)-2n-(p)-3d → 5-4 max
1c-(p)-2h-(p)-2n-(p)-3h → 5-5 min
1c-(p)-2h-(p)-2n-(p)-3s → 5-5 max
```

---

## 4. 1D Opening

**Context:** We open 1D (longer minor; with 4-4 open 1C)

### 4.1 Responses to 1D

```
1d-(p)-1h → 4+ hearts, forcing
1d-(p)-1s → 4+ spades, forcing
1d-(p)-1n → 6-10 HCP, denies 4M
1d-(p)-2c → 2/1 GF
1d-(p)-2d → inverted minor, GF
1d-(p)-2h → 5S-4H or 5-5 or 6-5 majors, good 7 to bad 9 HCP
1d-(p)-2s → 5+ diamonds, limit raise
1d-(p)-2n → 10-11 HCP balanced
1d-(p)-3c → splinter (club shortness), 12-14 or 18+, denies 4M
1d-(p)-3d → preemptive raise, 5-6 HCP
1d-(p)-3h → splinter (heart shortness), 12-14 or 18+, denies 4M
1d-(p)-3s → splinter (spade shortness), 12-14 or 18+, denies 4M
1d-(p)-3n → 12-14 HCP, no 4M
1d-(p)-4c → splinter (club shortness), 12-14 or 18+, denies 4M [double jump]
```

### 4.2 After 1D-2C (2/1 GF)

```
1d-(p)-2c-(p)-2d → 5+ diamonds, does not deny 4M
1d-(p)-2c-(p)-3d → 0/1 loser diamond suit
```

---

## 5. Opener Rebids (after 1m-1M)

### 5.1 Balanced Rebids

```
1c-(p)-1h-(p)-2n → 18-19 balanced | transfers apply over this
1c-(p)-1s-(p)-2n → 18-19 balanced | transfers apply over this
1d-(p)-1h-(p)-2n → 18-19 balanced | transfers apply over this
1d-(p)-1s-(p)-2n → 18-19 balanced | transfers apply over this
```

### 5.2 Rebids Showing Long Minor

```
1c-(p)-1h-(p)-2c → 6+ clubs, minimum
1c-(p)-1s-(p)-2c → 6+ clubs, minimum
1c-(p)-1h-(p)-2c-(p)-2d → artificial invite with 5M
1c-(p)-1h-(p)-2c-(p)-2n → balanced invite
1c-(p)-1h-(p)-2c-(p)-2h → to play
1c-(p)-1h-(p)-2c-(p)-3h → 6+ hearts, 0/1 loser, GF+

1d-(p)-1h-(p)-2d → 6+ diamonds
1d-(p)-1s-(p)-2d → 6+ diamonds
1d-(p)-1h-(p)-2d-(p)-2n → invitational
1d-(p)-1h-(p)-2d-(p)-2h → minimum
1d-(p)-1h-(p)-2d-(p)-3h → 6+ hearts, 0/1 loser, GF+
```

### 5.3 Reverse Sequences

```
RULE: After reverse, 2NT starts a weak sequence
1c-(p)-1h-(p)-2d-(p)-2n → start of weak sequence
1c-(p)-1h-(p)-2d-(p)-2n-(p)-3c → minimum, NF
1c-(p)-1h-(p)-2d-(p)-2n-(p)-3d → minimum, NF
```

### 5.4 Jump Rebids in Minor

```
1c-(p)-1h-(p)-3c → 6+ clubs, 15-17, NF
1c-(p)-1s-(p)-3c → 6+ clubs, 15-17, NF
1d-(p)-1h-(p)-3d → 6+ diamonds, 15-17, NF
1d-(p)-1s-(p)-3d → 6+ diamonds, 15-17, NF
```

### 5.5 Jump Shifts by Opener (GF)

```
1c-(p)-1d-(p)-2h → GF, 4+ hearts
1c-(p)-1d-(p)-2s → GF, 4+ spades
1c-(p)-1h-(p)-2s → GF, 4+ spades
1d-(p)-1h-(p)-2s → GF, 4+ spades
```

### 5.6 Self-Splinter by Opener

```
1c-(p)-1n-(p)-3d → self-splinter, long clubs, singleton diamond, 18+
1c-(p)-1n-(p)-3h → self-splinter, long clubs, singleton heart, 18+
1c-(p)-1n-(p)-3s → self-splinter, long clubs, singleton spade, 18+
1d-(p)-1n-(p)-3h → self-splinter, long diamonds, singleton heart, 18+
1d-(p)-1n-(p)-3s → self-splinter, long diamonds, singleton spade, 18+
```

### 5.7 Running Minor, Balanced

```
1c-(p)-1h-(p)-3n → running clubs, 18-19, no singleton
1c-(p)-1s-(p)-3n → running clubs, 18-19, no singleton
1d-(p)-1h-(p)-3n → running diamonds, 18-19, no singleton
1d-(p)-1s-(p)-3n → running diamonds, 18-19, no singleton
```

### 5.8 Support for Major

```
1c-(p)-1h-(p)-2h → 12-14, 4-card heart support
1c-(p)-1s-(p)-2s → 12-14, 4-card spade support
1d-(p)-1h-(p)-2h → 12-14, 4-card heart support
1d-(p)-1s-(p)-2s → 12-14, 4-card spade support

1c-(p)-1h-(p)-2h-(p)-2s → relay, asks pattern
1d-(p)-1h-(p)-2h-(p)-2s → relay, asks pattern

1c-(p)-1h-(p)-3h → 4-card support, invitational, NF
1c-(p)-1s-(p)-3s → 4-card support, invitational, NF
1d-(p)-1h-(p)-3h → 4-card support, invitational, NF
1d-(p)-1s-(p)-3s → 4-card support, invitational, NF

1c-(p)-1h-(p)-3d → power raise, 18+, 4 hearts | 4H to play
1c-(p)-1s-(p)-3h → power raise, 18+, 4 spades | 4S to play
1d-(p)-1h-(p)-3s → power raise, 18+, 4 hearts | 4H to play
1d-(p)-1s-(p)-4c → power raise, 18+, 4 spades | 4S to play

1c-(p)-1h-(p)-4c → good 6 clubs, 4 hearts, 18+ (weak major, 6m may be option)
1c-(p)-1s-(p)-4c → good 6 clubs, 4 spades, 18+ (weak major, 6m may be option)
1d-(p)-1h-(p)-4d → good 6 diamonds, 4 hearts, 18+ (weak major, 6m may be option)
1d-(p)-1s-(p)-4d → good 6 diamonds, 4 spades, 18+ (weak major, 6m may be option)

1c-(p)-1h-(p)-4h → shape (6 clubs, 4 hearts) but lower HCP, good trumps, < solid minor
1c-(p)-1s-(p)-4s → shape (6 clubs, 4 spades) but lower HCP, good trumps, < solid minor
1d-(p)-1h-(p)-4h → shape (6 diamonds, 4 hearts) but lower HCP, good trumps, < solid minor
1d-(p)-1s-(p)-4s → shape (6 diamonds, 4 spades) but lower HCP, good trumps, < solid minor
```

---

## 6. 1m Opening - Competition

### 6.1 XYZ in Competition

```
RULE: XYZ on over interference when both 2C and 2D can be bid, else off
```

### 6.2 Over 1m-(1NT)

```
1c-(1n)-x → values, penalty-oriented
1c-(1n)-2c → both majors
1c-(1n)-2d → natural, diamonds
1c-(1n)-2h → natural, hearts
1c-(1n)-2s → natural, spades

1d-(1n)-x → values, penalty-oriented
1d-(1n)-2c → both majors
1d-(1n)-2d → natural, diamonds
1d-(1n)-2h → natural, hearts
1d-(1n)-2s → natural, spades
```

---

## 7. 1H Opening

**Context:** We open 1H (5+ hearts, 12-21 HCP)

### 7.1 Responses to 1H

```
1h-(p)-1n → semi-forcing
1h-(p)-2c → 2/1 GF [by UPH] | 3-card heart support, 10-11 [by PH]
1h-(p)-2d → 2/1 GF [by UPH] | 4-card heart support, 10-11 [by PH]
1h-(p)-2h → 8-10, short suit + help suit game try applies
1h-(p)-2s → mini-splinter (spade shortness), next step asks
1h-(p)-2n → Jacoby, 12+ GF
1h-(p)-3c → 10-11 HCP, 6+ clubs
1h-(p)-3d → 10-11 HCP, 6+ diamonds
1h-(p)-3h → 4-card limit raise
1h-(p)-3s → splinter (spade shortness)
1h-(p)-4c → splinter (club shortness)
1h-(p)-4d → splinter (diamond shortness)
```

### 7.2 After 1H-1NT (semi-forcing)

```
1h-(p)-1n-(p)-2n → 18+ GF, single-suited or 2-suited
1h-(p)-1n-(p)-2n-(p)-3c → asks shape
1h-(p)-1n-(p)-2n-(p)-3c-(p)-3d → 4+ diamonds
1h-(p)-1n-(p)-2n-(p)-3c-(p)-3h → 6 hearts
1h-(p)-1n-(p)-2n-(p)-3c-(p)-3s → 4 spades
1h-(p)-1n-(p)-2n-(p)-3c-(p)-3n → 4+ clubs

1h-(p)-1n-(p)-3n → 18-19 balanced, 5332 shape
```

### 7.3 After 1H-X (transfers on)

```
1h-(x)-xx → transfer to spades (good hand)
1h-(x)-1s → transfer to 1NT
1h-(x)-1n → transfer to 2C
1h-(x)-2c → transfer to 2D
1h-(x)-2d → transfer to 2H (support)
1h-(x)-2h → weak raise
```

---

## 8. 1S Opening

**Context:** We open 1S (5+ spades, 12-21 HCP)

### 8.1 Responses to 1S

```
1s-(p)-1n → semi-forcing
1s-(p)-2c → 2/1 GF [by UPH] | 3-card spade support, 10-11 [by PH]
1s-(p)-2d → 2/1 GF [by UPH] | 4-card spade support, 10-11 [by PH]
1s-(p)-2h → 2/1 GF
1s-(p)-2s → 8-10, short suit + help suit game try applies
1s-(p)-2n → mini-splinter (club shortness), next step asks
1s-(p)-3c → Jacoby, 12+ GF | over 3C, 3NT = club short
1s-(p)-3d → 10-11 HCP, 6+ diamonds
1s-(p)-3h → 10-11 HCP, 6+ hearts
1s-(p)-3s → 4-card limit raise
1s-(p)-4c → splinter (club shortness)
1s-(p)-4d → splinter (diamond shortness)
1s-(p)-4h → splinter (heart shortness)
```

### 8.2 After 1S-1NT (semi-forcing)

```
1s-(p)-1n-(p)-2n → 18+ GF, single-suited or 2-suited
1s-(p)-1n-(p)-2n-(p)-3c → asks shape
1s-(p)-1n-(p)-2n-(p)-3c-(p)-3d → 4+ diamonds
1s-(p)-1n-(p)-2n-(p)-3c-(p)-3h → 4 hearts
1s-(p)-1n-(p)-2n-(p)-3c-(p)-3s → 6 spades
1s-(p)-1n-(p)-2n-(p)-3c-(p)-3n → 4+ clubs

1s-(p)-1n-(p)-3n → 18-19 balanced, 5332 shape
```

### 8.3 After 1S-X (transfers on)

```
1s-(x)-xx → good hand, no fit
1s-(x)-1n → transfer to 2C
1s-(x)-2c → transfer to 2D
1s-(x)-2d → transfer to 2H
1s-(x)-2h → transfer to 2S (support)
1s-(x)-2s → weak raise
```

---

## 9. 1NT Opening

**Context:** We open 1NT (15-17 balanced)

### 9.1 Responses to 1NT

```
1n-(p)-2c → Stayman
1n-(p)-2d → transfer to hearts
1n-(p)-2h → transfer to spades
1n-(p)-2s → clubs (opener bids 3C with 3+ clubs, 2NT otherwise)
1n-(p)-2n → sign-off in minor, or long diamonds any strength
1n-(p)-3c → 5-5 minors, invitational
1n-(p)-3d → 5-5 minors, GF
1n-(p)-4c → transfer to hearts, GF
1n-(p)-4d → transfer to spades, GF
```

### 9.2 After 1NT-2C (Stayman)

```
1n-(p)-2c-(p)-2d → no 4-card major
1n-(p)-2c-(p)-2h → 4+ hearts
1n-(p)-2c-(p)-2s → 4+ spades
1n-(p)-2c-(p)-3h → 5 hearts, maximum
1n-(p)-2c-(p)-3s → 5 spades, maximum
```

### 9.3 After 1NT-2C-2D (no major)

```
1n-(p)-2c-(p)-2d-(p)-2h → garbage (5 spades, 4 hearts), to play
1n-(p)-2c-(p)-2d-(p)-3d → 5-5 majors, invitational
1n-(p)-2c-(p)-2d-(p)-3h → Smolen, 5 hearts 4 spades, GF
1n-(p)-2c-(p)-2d-(p)-3s → Smolen, 5 spades 4 hearts, GF
```

### 9.4 After 1NT-2C-2H (4 hearts)

```
1n-(p)-2c-(p)-2h-(p)-2s → 4 spades, invitational
1n-(p)-2c-(p)-2h-(p)-3d → agree hearts, slammish
```

### 9.5 After 1NT-2D/2H (transfers)

```
1n-(p)-2d-(p)-2h → complete transfer
1n-(p)-2d-(p)-3h → superaccept

1n-(p)-2h-(p)-2s → complete transfer
1n-(p)-2h-(p)-3s → superaccept
1n-(p)-2h-(p)-2s-(p)-3h → 5-5 majors, GF
```

### 9.6 After 1NT-2S (clubs)

```
1n-(p)-2s-(p)-2n → fewer than 3 clubs
1n-(p)-2s-(p)-3c → 3+ clubs
```

### 9.7 After 1NT-2NT (minor sign-off)

```
1n-(p)-2n-(p)-3c → fewer than 3 diamonds
1n-(p)-2n-(p)-3d → 3+ diamonds
```

### 9.8 Over 1NT-(X) [non-penalty double]

```
RULE: Systems on
```

### 9.9 Over 1NT-(X) [penalty double]

```
RULE: DONT runouts
```

### 9.10 Over 1NT-(2C)

```
1n-(2c)-x → Stayman
```

### 9.11 Over 1NT-(2x) natural

```
RULE: Lebensohl applies
```

---

## 10. 2NT Opening

**Context:** We open 2NT (20-21 balanced)

### 10.1 Responses to 2NT

```
2n-(p)-3c → Stayman (Puppet)
2n-(p)-3d → transfer to hearts
2n-(p)-3h → transfer to spades
2n-(p)-3s → puppet to 3NT (minor-oriented hands)
2n-(p)-3n → to play
2n-(p)-4c → transfer to hearts
2n-(p)-4d → transfer to spades
2n-(p)-4h → 5-5 minors, singleton heart
2n-(p)-4s → 5-5 minors, singleton spade
2n-(p)-5c → to play
2n-(p)-5d → to play
```

### 10.2 After 2NT-3C (Stayman)

```
2n-(p)-3c-(p)-3d-(p)-3h → Smolen, 5 hearts 4 spades
2n-(p)-3c-(p)-3d-(p)-3s → Smolen, 5 spades 4 hearts
```

### 10.3 After 2NT-3D (transfer)

```
2n-(p)-3d-(p)-3h-(p)-3s → 5-5 majors
```

### 10.4 After 2NT-3S-3NT (puppet to 3NT)

```
2n-(p)-3s-(p)-3n-(p)-4c → 6+ diamonds | next step sets diamonds, 4NT/5D to play
2n-(p)-3s-(p)-3n-(p)-4d → 6+ clubs | next step sets clubs, 4NT/5C to play
2n-(p)-3s-(p)-3n-(p)-4h → 5 clubs, 4 diamonds | 4NT/5m to play
2n-(p)-3s-(p)-3n-(p)-4s → 5 diamonds, 4 clubs | 4NT/5m to play
2n-(p)-3s-(p)-3n-(p)-4n → quantitative slam try, 4-4 minors
```

### 10.5 Quantitative Raises

```
RULE: Quantitative with 5332 (5-card minor) or 4333
```

---

## 11. 2C Opening

**Context:** Strong artificial opening (22+ or 8.5+ tricks)

### 11.1 Responses to 2C

```
2c-(p)-2d → 3+ HCP (min K or QJ), semi-positive, GF
2c-(p)-2h → bust (0-2 HCP)
2c-(p)-2n → hearts (positive)
2c-(p)-3c → club suit, 8+, good suit
2c-(p)-3d → diamond suit, 8+, good suit
```

### 11.2 After 2C-2D (semi-positive)

```
2c-(p)-2d-(p)-2h → puppet to 2S
2c-(p)-2d-(p)-2h-(p)-2s → waiting
2c-(p)-2d-(p)-2h-(p)-2s-(p)-2n → 22-24 or 27+ balanced
2c-(p)-2d-(p)-2h-(p)-2s-(p)-3x → hearts + x
2c-(p)-2d-(p)-2h-(p)-2s-(p)-3h → heart suit

2c-(p)-2d-(p)-2h-(p)-2n → spades (8+, broken suit)
2c-(p)-2d-(p)-2s → own suit, 8+, broken suit (skipping puppet)
```

### 11.3 Over 2C-(X) or 2C-(bid)

```
2c-(x)-p → positive
2c-(x)-xx → bust
2c-(2x)-x → bust
2c-(2x)-p → positive
```

---

## 12. Preemptive Openings

### 12.1 4th Seat Preempts

```
RULE: [4th seat] 2D/2H/2S = natural, 6+, 11-13 HCP, all vulnerabilities
```

### 12.2 RKC for Preempts

```
RULE: 4NT over any preempt = RKC for that suit
```

### 12.3 Fit-Showing over Preempts

```
RULE: All jumps by responder over a preempt = fit-showing
```

### 12.4 Doubles by Preemptor's Partner

```
RULE: Double of opponent's bid by preemptor's partner = penalty
```

### 12.5 Multi 2D

```
2d-(p)-? → weak in either major OR 20-21 with 5-card minor
2d-(p)-2h → pass/correct
2d-(p)-2n → asks
2d-(p)-2n-(p)-3m → good hand
2d-(p)-2n-(p)-3M → bad hand
2d-(p)-2s → own suit?
```

---

## 13. They Open First - Competitive

### 13.1 Michaels Cue Bids

```
(1c)-2c → Michaels, both majors, 8-10 or 15+, 5-5
(1d)-2d → Michaels, both majors, 8-10 or 15+, 5-5
(1h)-2h → Michaels, spades + minor, 8-10 or 15+, 5-4+
(1s)-2s → Michaels, hearts + minor, 8-10 or 15+, 5-4+
(1n)-2c → both majors, 8-10 or 15+, 5-5
(1n)-2h → hearts + minor, 5-4+ (5-5 if vulnerable)
(1n)-2s → spades + minor, 5-4+ (5-5 if vulnerable)
```

### 13.2 Unusual 2NT

```
(1c)-2n → diamonds + hearts (lowest 2 unbid)
(1d)-2n → clubs + hearts (lowest 2 unbid)
(1h)-2n → clubs + diamonds (minors)
(1s)-2n → clubs + diamonds (minors)
```

### 13.3 1NT Overcall

```
(1x)-p-(1y)-1n → 15-17 [by UPH] | 5-5 unbid suits [by PH]
```

### 13.4 After (1m)-P-(1NT)

```
(1c)-p-(1n)-2c → 4-5 or 5-5 spades/hearts
(1c)-p-(1n)-2d → 5-5 majors
(1d)-p-(1n)-2c → 4-5 or 5-5 spades/hearts
(1d)-p-(1n)-2d → 5-5 majors
```

### 13.5 After (1H)-P-(2H) or (1S)-P-(2S)

```
(1h)-p-(2h)-2n → minors
(1s)-p-(2s)-2n → 2 places to play
```

### 13.6 Balancing Seat

```
(1x)-p-(p)-1n → 11-14 | 2C = range ask + Stayman
(1x)-p-(p)-2y → 11-13, 6+ cards [jump bid]
(1x)-p-(p)-2n → 20-21, systems on
```

### 13.7 Over Strong 1C

```
(str 1c)-x → majors
(str 1c)-1n → minors
(str 1c)-p-(1d)-x → majors
(str 1c)-p-(1d)-1n → minors
```

### 13.8 Over Strong 2C

```
(str 2c)-x → clubs
(str 2c)-p-(2d)-x → diamonds
```

### 13.9 Over 1NT

```
RULE: [vs strong NT, direct seat, by PH] Woolsey (X = penalty)
RULE: [vs strong NT, other] DONT
RULE: [vs weak NT, by UPH] X = penalty
```

### 13.10 Over 2x or 3x Preempts

```
RULE: Lebensohl applies after (2x)-X-(P) and (2x)-P-(P)-X
```

---

## Appendix: Conventions Reference

| Convention | Applies | Description |
|------------|---------|-------------|
| XYZ | 1x-1y-1z, 1x-1y-1N | 2C = weak/invitational, 2D = GF relay |
| Lebensohl | After 2x overcall | 2NT puppet to 3C for weak hands |
| DONT | Over 1NT (mostly) | D=single suit, O=two suits, N=natural, T=transfer |
| Woolsey | Over 1NT (specific) | X=penalty, 2m=m+M, 2M=OM+m |
| DOPI | Interference < 5-level | X=1/4, P=0/3, step=2 |
| DOPE | Interference ≥ 5-level | X=odd, P=even, step=2+Q |
| Smolen | After Stayman | Jump in 4-card major shows 5 of other |
| Jacoby 2NT | 1M-2NT | 12+ GF with 4+ support |
| Mini-splinter | 1H-2S, 1S-2NT | Shortness, weaker than full splinter |
| Minorwood | When minor agreed < 3NT | 4m = RKC |
| EKC | Jump beyond game | Exclusion Key Card (0314) |

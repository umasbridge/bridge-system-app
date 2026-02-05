# GIB System - Normalized (Parseable Format)

Version: GIB v40 (Feb 2019)
Format: `sequence = meaning` (one rule per line)
Notation: lowercase bids, -(p)- for pass, (x) for opponent bid in parens

---

## Opening Bids

1c = Minor suit opening, 3+ clubs, 11-21 HCP, 12-22 total points
1d = Minor suit opening, 3+ diamonds, 11-21 HCP, 12-22 total points
1h = Major suit opening, 5+ hearts, 11-21 HCP, 12-22 total points
1s = Major suit opening, 5+ spades, 11-21 HCP, 12-22 total points
1n = Notrump opener, balanced, may have 5M, 15-17 HCP
2c = Strong artificial, 22+ HCP, forcing to 2NT
2d = Weak two, 6+ diamonds, 6-10 HCP, disciplined
2h = Weak two, 6+ hearts, 6-10 HCP, disciplined
2s = Weak two, 6+ spades, 6-10 HCP, disciplined
2n = Notrump opener, balanced, may have 5M, 20-21 HCP
3c = Preempt, 7+ clubs, 5-9 HCP
3d = Preempt, 7+ diamonds, 5-9 HCP
3h = Preempt, 7+ hearts, 5-9 HCP
3s = Preempt, 7+ spades, 5-9 HCP

---

## Responses to 1m Opening

1c-(p)-1d = One over one, 4+ diamonds, 6+ HCP, forcing
1c-(p)-1h = One over one, 4+ hearts, 6+ HCP, forcing
1c-(p)-1s = One over one, 4+ spades, 6+ HCP, forcing
1c-(p)-1n = 6-10 HCP, no 4-card major, 2-4 in each suit
1c-(p)-2c = Inverted minor raise, 10+ HCP, 5+ clubs, forcing
1c-(p)-2d = 2/1 Game Force, 5+ diamonds, 13+ HCP
1c-(p)-2n = 13-15 HCP, balanced, game forcing
1c-(p)-3c = Limit raise, 10-12 points, 5+ clubs
1c-(p)-3n = 16-18 HCP, balanced

1d-(p)-1h = One over one, 4+ hearts, 6+ HCP, forcing
1d-(p)-1s = One over one, 4+ spades, 6+ HCP, forcing
1d-(p)-1n = 6-10 HCP, no 4-card major
1d-(p)-2c = 2/1 Game Force, 5+ clubs, 13+ HCP, forcing to 3NT
1d-(p)-2d = Inverted minor raise, 4+ diamonds, 10+ HCP, forcing
1d-(p)-2n = 13-15 HCP, balanced, game forcing
1d-(p)-3d = Limit raise, 10-12 points, 5+ diamonds
1d-(p)-3n = 16-18 HCP, balanced

---

## Opener Rebids After 1m-(p)-1x

1c-(p)-1d-(p)-1h = 4+ hearts, may have 4 spades, continuing search
1c-(p)-1d-(p)-1s = 4+ spades, denies 4 hearts
1c-(p)-1d-(p)-1n = 12-14 HCP balanced, no 4-card major
1c-(p)-1d-(p)-2c = 6+ clubs, minimum
1c-(p)-1d-(p)-2d = 4+ diamonds, minimum
1c-(p)-1d-(p)-2n = 18-19 HCP balanced
1c-(p)-1d-(p)-3c = 6+ clubs, 17-20 HCP (jump rebid)
1c-(p)-1d-(p)-3d = 4+ diamonds, 16-18 points (jump raise)

1c-(p)-1h-(p)-1s = 4+ spades
1c-(p)-1h-(p)-1n = 12-14 HCP balanced
1c-(p)-1h-(p)-2c = 6+ clubs, minimum
1c-(p)-1h-(p)-2h = 4-card heart support, minimum
1c-(p)-1h-(p)-2n = 18-19 HCP balanced
1c-(p)-1h-(p)-3c = 6+ clubs, 17-20 HCP (jump rebid)
1c-(p)-1h-(p)-3h = 4-card heart support, 16-18 points (jump raise)

1c-(p)-1s-(p)-1n = 12-14 HCP balanced
1c-(p)-1s-(p)-2c = 6+ clubs, minimum
1c-(p)-1s-(p)-2s = 4-card spade support, minimum
1c-(p)-1s-(p)-2n = 18-19 HCP balanced
1c-(p)-1s-(p)-3c = 6+ clubs, 17-20 HCP (jump rebid)
1c-(p)-1s-(p)-3s = 4-card spade support, 16-18 points (jump raise)

1d-(p)-1h-(p)-1s = 4+ spades
1d-(p)-1h-(p)-1n = 12-14 HCP balanced
1d-(p)-1h-(p)-2d = 6+ diamonds, minimum
1d-(p)-1h-(p)-2h = 4-card heart support, minimum
1d-(p)-1h-(p)-2n = 18-19 HCP balanced
1d-(p)-1h-(p)-3d = 6+ diamonds, 17-20 HCP (jump rebid)
1d-(p)-1h-(p)-3h = 4-card heart support, 16-18 points (jump raise)

1d-(p)-1s-(p)-1n = 12-14 HCP balanced
1d-(p)-1s-(p)-2d = 6+ diamonds, minimum
1d-(p)-1s-(p)-2s = 4-card spade support, minimum
1d-(p)-1s-(p)-2n = 18-19 HCP balanced
1d-(p)-1s-(p)-3d = 6+ diamonds, 17-20 HCP (jump rebid)
1d-(p)-1s-(p)-3s = 4-card spade support, 16-18 points (jump raise)

---

## Responses to 1M Opening

1h-(p)-1s = One over one, 4+ spades, 6+ HCP, forcing
1h-(p)-1n = Forcing 1NT, 6-12 HCP, denies 3+ hearts, denies 4 spades
1h-(p)-2c = 2/1 Game Force, 5+ clubs, 13+ HCP, forcing
1h-(p)-2d = 2/1 Game Force, 5+ diamonds, 13+ HCP, forcing
1h-(p)-2h = Simple raise, 3+ hearts, 7-10 total points
1h-(p)-2n = Jacoby 2NT, 4+ hearts, game forcing
1h-(p)-3c = Soloway jump shift, 17+ TP, 4+ controls, strong 5+ clubs
1h-(p)-3d = Soloway jump shift, 17+ TP, 4+ controls, strong 5+ diamonds
1h-(p)-3h = Limit raise, 3+ hearts, 10-12 points
1h-(p)-3n = 13-15 total points, balanced, choice of games
1h-(p)-4c = Splinter, singleton/void club, 4+ hearts, game forcing
1h-(p)-4d = Splinter, singleton/void diamond, 4+ hearts, game forcing
1h-(p)-4s = Splinter, singleton/void spade, 4+ hearts, game forcing
1h-(p)-4h = To play

1s-(p)-1n = Forcing 1NT, 6-12 HCP, denies 3+ spades
1s-(p)-2c = 2/1 Game Force, 5+ clubs, 13+ HCP, forcing
1s-(p)-2d = 2/1 Game Force, 5+ diamonds, 13+ HCP, forcing
1s-(p)-2h = 2/1 Game Force, 5+ hearts, 12+ HCP, forcing to 3NT
1s-(p)-2s = Simple raise, 3+ spades, 7-10 total points
1s-(p)-2n = Jacoby 2NT, 4+ spades, game forcing
1s-(p)-3c = Soloway jump shift, 17+ TP, 4+ controls, strong 5+ clubs
1s-(p)-3d = Soloway jump shift, 17+ TP, 4+ controls, strong 5+ diamonds
1s-(p)-3h = Soloway jump shift, 17+ TP, 4+ controls, strong 5+ hearts
1s-(p)-3s = Limit raise, 3+ spades, 10-12 points
1s-(p)-3n = 13-15 total points, balanced, choice of games
1s-(p)-4c = Splinter, singleton/void club, 4+ spades, game forcing
1s-(p)-4d = Splinter, singleton/void diamond, 4+ spades, game forcing
1s-(p)-4h = Splinter, singleton/void heart, 4+ spades, game forcing
1s-(p)-4s = To play

---

## Opener Rebids After 1M-(p)-1NT Forcing

1h-(p)-1n-(p)-2c = 4+ clubs, may be 3 with 5332
1h-(p)-1n-(p)-2d = 4+ diamonds
1h-(p)-1n-(p)-2h = 6+ hearts, minimum
1h-(p)-1n-(p)-2s = 4+ spades, reverse (17+ points)
1h-(p)-1n-(p)-2n = 18-19 HCP balanced
1h-(p)-1n-(p)-3c = 5+ hearts, 4+ clubs, 17+ points
1h-(p)-1n-(p)-3d = 5+ hearts, 4+ diamonds, 17+ points
1h-(p)-1n-(p)-3h = 6+ hearts, 17-20 HCP (jump rebid)

1s-(p)-1n-(p)-2c = 4+ clubs, may be 3 with 5332
1s-(p)-1n-(p)-2d = 4+ diamonds
1s-(p)-1n-(p)-2h = 4+ hearts, does not promise extra values
1s-(p)-1n-(p)-2s = 6+ spades, minimum
1s-(p)-1n-(p)-2n = 18-19 HCP balanced
1s-(p)-1n-(p)-3c = 5+ spades, 4+ clubs, 17+ points
1s-(p)-1n-(p)-3d = 5+ spades, 4+ diamonds, 17+ points
1s-(p)-1n-(p)-3h = 5+ spades, 4+ hearts, 17+ points
1s-(p)-1n-(p)-3s = 6+ spades, 17-20 HCP (jump rebid)

---

## Opener Rebids After 2/1 Response

1h-(p)-2c-(p)-2d = 4+ diamonds, natural
1h-(p)-2c-(p)-2h = 6+ hearts, minimum in context
1h-(p)-2c-(p)-2s = 4+ spades
1h-(p)-2c-(p)-2n = 12-14 HCP balanced, stoppers
1h-(p)-2c-(p)-3c = 4+ club support
1h-(p)-2c-(p)-3h = 6+ hearts, extras

1h-(p)-2d-(p)-2h = 6+ hearts, minimum in context
1h-(p)-2d-(p)-2s = 4+ spades
1h-(p)-2d-(p)-2n = 12-14 HCP balanced, stoppers
1h-(p)-2d-(p)-3d = 4+ diamond support
1h-(p)-2d-(p)-3h = 6+ hearts, extras

1s-(p)-2c-(p)-2d = 4+ diamonds, natural
1s-(p)-2c-(p)-2h = 4+ hearts
1s-(p)-2c-(p)-2s = 6+ spades, minimum in context
1s-(p)-2c-(p)-2n = 12-14 HCP balanced, stoppers
1s-(p)-2c-(p)-3c = 4+ club support
1s-(p)-2c-(p)-3s = 6+ spades, extras

1s-(p)-2d-(p)-2h = 4+ hearts
1s-(p)-2d-(p)-2s = 6+ spades, minimum in context
1s-(p)-2d-(p)-2n = 12-14 HCP balanced, stoppers
1s-(p)-2d-(p)-3d = 4+ diamond support
1s-(p)-2d-(p)-3s = 6+ spades, extras

1s-(p)-2h-(p)-2s = 6+ spades, minimum in context
1s-(p)-2h-(p)-2n = 12-14 HCP balanced, stoppers
1s-(p)-2h-(p)-3h = 3+ heart support
1s-(p)-2h-(p)-3s = 6+ spades, extras
1s-(p)-2h-(p)-4h = 4+ heart support, minimum

---

## Jacoby 2NT Responses

1h-(p)-2n-(p)-3c = Shortness in clubs, singleton/void, 5+ hearts, 11-21 HCP
1h-(p)-2n-(p)-3d = Shortness in diamonds, singleton/void, 5+ hearts, 11-21 HCP
1h-(p)-2n-(p)-3s = Shortness in spades, singleton/void, 5+ hearts, 11-21 HCP
1h-(p)-2n-(p)-3h = Extra length, no shortness, 6+ hearts
1h-(p)-2n-(p)-4h = Balanced minimum, 5+ hearts, 11-14 HCP

1s-(p)-2n-(p)-3c = Shortness in clubs, singleton/void, 5+ spades, 11-21 HCP
1s-(p)-2n-(p)-3d = Shortness in diamonds, singleton/void, 5+ spades, 11-21 HCP
1s-(p)-2n-(p)-3h = Shortness in hearts, singleton/void, 5+ spades, 11-21 HCP
1s-(p)-2n-(p)-3s = Extra length, no shortness, 6+ spades
1s-(p)-2n-(p)-4s = Balanced minimum, 5+ spades, 11-14 HCP

---

## Two-Way Game Tries

1h-(p)-2h-(p)-2s = Short-suit game try, unspecified shortness, 17-18 total points
1h-(p)-2h-(p)-2n = Long-suit game try in clubs, 3+ clubs with honors
1h-(p)-2h-(p)-3c = Long-suit game try in clubs
1h-(p)-2h-(p)-3d = Long-suit game try in diamonds
1h-(p)-2h-(p)-3h = General strength, ~17 points, no singleton/void

1s-(p)-2s-(p)-2n = Short-suit game try, unspecified shortness
1s-(p)-2s-(p)-3c = Long-suit game try in clubs
1s-(p)-2s-(p)-3d = Long-suit game try in diamonds
1s-(p)-2s-(p)-3h = Long-suit game try in hearts
1s-(p)-2s-(p)-3s = General strength, ~17 points, no singleton/void

---

## Soloway Jump Shift Continuations

# Soloway types: (1) strong rebiddable suit, (2) solid suit, (3) balanced 18+ HCP, (4) 4-card support for opener
# All require 17+ TP, 4+ controls

1h-(p)-3c-(p)-3d = Opener shows KQ in diamonds, denies club support
1h-(p)-3c-(p)-3h = Opener rebids suit, 6+ hearts
1h-(p)-3c-(p)-3s = Opener shows KQ in spades, denies club support
1h-(p)-3c-(p)-3n = Opener has nothing specific to say
1h-(p)-3c-(p)-4c = Opener raises, club support
1h-(p)-3c-(p)-4n = Opener RKCB, 3+ club support

1h-(p)-3d-(p)-3h = Opener rebids suit, 6+ hearts
1h-(p)-3d-(p)-3s = Opener shows KQ in spades, denies diamond support
1h-(p)-3d-(p)-3n = Opener has nothing specific to say
1h-(p)-3d-(p)-4c = Opener shows KQ in clubs, denies diamond support
1h-(p)-3d-(p)-4d = Opener raises, diamond support
1h-(p)-3d-(p)-4n = Opener RKCB, 3+ diamond support

1s-(p)-3c-(p)-3d = Opener shows KQ in diamonds, denies club support
1s-(p)-3c-(p)-3h = Opener shows KQ in hearts, denies club support
1s-(p)-3c-(p)-3s = Opener rebids suit, 6+ spades
1s-(p)-3c-(p)-3n = Opener has nothing specific to say
1s-(p)-3c-(p)-4c = Opener raises, club support
1s-(p)-3c-(p)-4n = Opener RKCB, 3+ club support

1s-(p)-3d-(p)-3h = Opener shows KQ in hearts, denies diamond support
1s-(p)-3d-(p)-3s = Opener rebids suit, 6+ spades
1s-(p)-3d-(p)-3n = Opener has nothing specific to say
1s-(p)-3d-(p)-4c = Opener shows KQ in clubs, denies diamond support
1s-(p)-3d-(p)-4d = Opener raises, diamond support
1s-(p)-3d-(p)-4n = Opener RKCB, 3+ diamond support

1s-(p)-3h-(p)-3s = Opener rebids suit, 6+ spades
1s-(p)-3h-(p)-3n = Opener has nothing specific to say
1s-(p)-3h-(p)-4c = Opener shows KQ in clubs, denies heart support
1s-(p)-3h-(p)-4d = Opener shows KQ in diamonds, denies heart support
1s-(p)-3h-(p)-4h = Opener raises, heart support
1s-(p)-3h-(p)-4n = Opener RKCB, 3+ heart support

# Jump shifter rebids after opener's response
1h-(p)-3c-(p)-3n-(p)-4c = Type 1/2: rebid suit, strong clubs
1h-(p)-3c-(p)-3n-(p)-4h = Type 4: raise opener, 4-card heart support
1h-(p)-3c-(p)-3n-(p)-3n = Type 3: balanced 18+ HCP

---

## 1NT Responses

1n-(p)-2c = Stayman, asks for 4-card major
1n-(p)-2d = Jacoby transfer, 5+ hearts
1n-(p)-2h = Jacoby transfer, 5+ spades
1n-(p)-2s = Minor Suit Stayman, 4+ clubs, 4+ diamonds, 10+ points
1n-(p)-2n = Minor transfer, 6+ clubs
1n-(p)-3c = Minor transfer, 6+ diamonds
1n-(p)-3d = Singleton/void diamond, 4+ in other suits, game forcing
1n-(p)-3h = Singleton/void heart, 4+ in other suits, game forcing
1n-(p)-3s = Singleton/void spade, 4+ in other suits, game forcing
1n-(p)-3n = Signoff
1n-(p)-4c = Gerber, ace-asking
1n-(p)-4d = Texas transfer, 6+ hearts
1n-(p)-4h = Texas transfer, 6+ spades
1n-(p)-4n = Invitational to 6NT
1n-(p)-5n = Invitational to 7NT

---

## After 1NT-Stayman

1n-(p)-2c-(p)-2d = No 4-card major
1n-(p)-2c-(p)-2h = 4 hearts, may have 4 spades
1n-(p)-2c-(p)-2s = 4 spades, denies 4 hearts

1n-(p)-2c-(p)-2d-(p)-2h = Invitational, 5 hearts + 4 spades
1n-(p)-2c-(p)-2d-(p)-2s = Invitational, 5 spades + 4 hearts
1n-(p)-2c-(p)-2d-(p)-2n = Invitational, no major fit
1n-(p)-2c-(p)-2d-(p)-3c = 5+ clubs, game forcing
1n-(p)-2c-(p)-2d-(p)-3d = 5+ diamonds, game forcing
1n-(p)-2c-(p)-2d-(p)-3h = Smolen, 4 hearts + 5 spades, game forcing
1n-(p)-2c-(p)-2d-(p)-3s = Smolen, 4 spades + 5 hearts, game forcing
1n-(p)-2c-(p)-2d-(p)-4n = Invitational to 6NT

1n-(p)-2c-(p)-2h-(p)-2s = Invitational, 4 spades
1n-(p)-2c-(p)-2h-(p)-2n = Invitational, denies 4 spades
1n-(p)-2c-(p)-2h-(p)-3c = 5+ clubs, game forcing
1n-(p)-2c-(p)-2h-(p)-3d = 5+ diamonds, game forcing
1n-(p)-2c-(p)-2h-(p)-3h = Invitational with heart fit
1n-(p)-2c-(p)-2h-(p)-3s = Slam try, 4+ hearts
1n-(p)-2c-(p)-2h-(p)-4c = Splinter, singleton/void club
1n-(p)-2c-(p)-2h-(p)-4d = Splinter, singleton/void diamond
1n-(p)-2c-(p)-2h-(p)-4n = Invitational to 6NT

1n-(p)-2c-(p)-2s-(p)-2n = Invitational
1n-(p)-2c-(p)-2s-(p)-3c = 5+ clubs, game forcing
1n-(p)-2c-(p)-2s-(p)-3d = 5+ diamonds, game forcing
1n-(p)-2c-(p)-2s-(p)-3h = Slam try, 4+ spades
1n-(p)-2c-(p)-2s-(p)-3s = Invitational with spade fit
1n-(p)-2c-(p)-2s-(p)-4c = Splinter, singleton/void club
1n-(p)-2c-(p)-2s-(p)-4d = Splinter, singleton/void diamond
1n-(p)-2c-(p)-2s-(p)-4h = Splinter, singleton/void heart
1n-(p)-2c-(p)-2s-(p)-4n = Invitational to 6NT

---

## After 1NT-Jacoby Transfer

1n-(p)-2d-(p)-2h = Transfer completed, may super-accept with max + 4 hearts
1n-(p)-2h-(p)-2s = Transfer completed, may super-accept with max + 4 spades

1n-(p)-2d-(p)-2n = Super-accept, 4+ hearts, maximum, no concentration
1n-(p)-2d-(p)-2s = Super-accept, 4+ hearts, maximum, values in spades
1n-(p)-2d-(p)-3c = Super-accept, 4+ hearts, maximum, values in clubs
1n-(p)-2d-(p)-3d = Super-accept, 4+ hearts, maximum, values in diamonds
1n-(p)-2d-(p)-3h = Super-accept, 4+ hearts, minimum with fit

1n-(p)-2h-(p)-2n = Super-accept, 4+ spades, maximum, no concentration
1n-(p)-2h-(p)-3c = Super-accept, 4+ spades, maximum, values in clubs
1n-(p)-2h-(p)-3d = Super-accept, 4+ spades, maximum, values in diamonds
1n-(p)-2h-(p)-3h = Super-accept, 4+ spades, maximum, values in hearts
1n-(p)-2h-(p)-3s = Super-accept, 4+ spades, minimum with fit

1n-(p)-2d-(p)-2h-(p)-2s = 5+ hearts, 5+ spades, invitational
1n-(p)-2d-(p)-2h-(p)-2n = Exactly 5 hearts, invitational
1n-(p)-2d-(p)-2h-(p)-3c = 5+ hearts, 4+ clubs, game forcing
1n-(p)-2d-(p)-2h-(p)-3d = 5+ hearts, 4+ diamonds, game forcing
1n-(p)-2d-(p)-2h-(p)-3h = Invitational, 6+ hearts
1n-(p)-2d-(p)-2h-(p)-3n = Exactly 5 hearts, choice of games
1n-(p)-2d-(p)-2h-(p)-3s = Splinter, 6+ hearts, short spades
1n-(p)-2d-(p)-2h-(p)-4c = Splinter, 6+ hearts, short clubs
1n-(p)-2d-(p)-2h-(p)-4d = Splinter, 6+ hearts, short diamonds
1n-(p)-2d-(p)-2h-(p)-4h = 6+ hearts, mild slam interest
1n-(p)-2d-(p)-2h-(p)-4n = Exactly 5 hearts, invitational to slam
1n-(p)-2d-(p)-2h-(p)-5n = Choice of slams

1n-(p)-2h-(p)-2s-(p)-2n = Exactly 5 spades, invitational
1n-(p)-2h-(p)-2s-(p)-3c = 5+ spades, 4+ clubs, game forcing
1n-(p)-2h-(p)-2s-(p)-3d = 5+ spades, 4+ diamonds, game forcing
1n-(p)-2h-(p)-2s-(p)-3h = 5+ spades, 5+ hearts, game forcing
1n-(p)-2h-(p)-2s-(p)-3s = Invitational, 6+ spades
1n-(p)-2h-(p)-2s-(p)-3n = Exactly 5 spades, choice of games
1n-(p)-2h-(p)-2s-(p)-4c = Splinter, 6+ spades, short clubs
1n-(p)-2h-(p)-2s-(p)-4d = Splinter, 6+ spades, short diamonds
1n-(p)-2h-(p)-2s-(p)-4h = Splinter, 6+ spades, short hearts
1n-(p)-2h-(p)-2s-(p)-4s = 6+ spades, mild slam interest
1n-(p)-2h-(p)-2s-(p)-4n = Exactly 5 spades, invitational to slam
1n-(p)-2h-(p)-2s-(p)-5n = Choice of slams

---

## After 1NT-Minor Transfer

1n-(p)-2n-(p)-3c = Transfer completed to clubs
1n-(p)-3c-(p)-3d = Transfer completed to diamonds

1n-(p)-2n-(p)-3c-(p)-p = To play in clubs
1n-(p)-2n-(p)-3c-(p)-3d = Singleton/void diamond
1n-(p)-2n-(p)-3c-(p)-3h = Singleton/void heart
1n-(p)-2n-(p)-3c-(p)-3s = Singleton/void spade
1n-(p)-2n-(p)-3c-(p)-3n = Mild slam try
1n-(p)-2n-(p)-3c-(p)-4n = RKCB for clubs

1n-(p)-3c-(p)-3d-(p)-p = To play in diamonds
1n-(p)-3c-(p)-3d-(p)-3h = Singleton/void heart
1n-(p)-3c-(p)-3d-(p)-3s = Singleton/void spade
1n-(p)-3c-(p)-3d-(p)-4c = Singleton/void club
1n-(p)-3c-(p)-3d-(p)-3n = Mild slam try
1n-(p)-3c-(p)-3d-(p)-4n = RKCB for diamonds

---

## 2NT Responses

2n-(p)-3c = Stayman
2n-(p)-3d = Jacoby transfer, 5+ hearts
2n-(p)-3h = Jacoby transfer, 5+ spades
2n-(p)-3s = Minor Suit Stayman
2n-(p)-3n = Signoff
2n-(p)-4c = Gerber
2n-(p)-4d = Texas transfer, 6+ hearts
2n-(p)-4h = Texas transfer, 6+ spades
2n-(p)-4n = Invitational to 6NT
2n-(p)-5n = Invitational to 7NT

---

## After 2NT-Stayman

2n-(p)-3c-(p)-3d = No 4-card major
2n-(p)-3c-(p)-3h = 4 hearts
2n-(p)-3c-(p)-3s = 4 spades

2n-(p)-3c-(p)-3d-(p)-3h = Smolen, 4 hearts + 5 spades, game forcing
2n-(p)-3c-(p)-3d-(p)-3s = Smolen, 4 spades + 5 hearts, game forcing
2n-(p)-3c-(p)-3d-(p)-4c = 5+ clubs, slam interest
2n-(p)-3c-(p)-3d-(p)-4d = 5+ diamonds, slam interest
2n-(p)-3c-(p)-3d-(p)-4h = Signoff
2n-(p)-3c-(p)-3d-(p)-4s = Signoff
2n-(p)-3c-(p)-3d-(p)-4n = Invitational to 6NT

2n-(p)-3c-(p)-3h-(p)-3s = Slam try, 4+ hearts
2n-(p)-3c-(p)-3h-(p)-3n = Choice of games, promises 4 spades
2n-(p)-3c-(p)-3h-(p)-4c = 5+ clubs, slam interest
2n-(p)-3c-(p)-3h-(p)-4d = 5+ diamonds, slam interest
2n-(p)-3c-(p)-3h-(p)-4n = Invitational to 6NT

2n-(p)-3c-(p)-3s-(p)-3n = Signoff, promises 4 hearts
2n-(p)-3c-(p)-3s-(p)-4c = 5+ clubs, slam interest
2n-(p)-3c-(p)-3s-(p)-4d = 5+ diamonds, slam interest
2n-(p)-3c-(p)-3s-(p)-4h = Slam try, 4+ spades
2n-(p)-3c-(p)-3s-(p)-4n = Invitational to 6NT

---

## After 2NT-Jacoby Transfer

2n-(p)-3d-(p)-3h = Transfer completed
2n-(p)-3h-(p)-3s = Transfer completed

2n-(p)-3d-(p)-3h-(p)-3s = 5+ hearts, 5+ spades, slam interest
2n-(p)-3d-(p)-3h-(p)-3n = Exactly 5 hearts, choice of games
2n-(p)-3d-(p)-3h-(p)-4c = 5+ hearts, 4+ clubs, game forcing
2n-(p)-3d-(p)-3h-(p)-4d = 5+ hearts, 4+ diamonds, game forcing
2n-(p)-3d-(p)-3h-(p)-4h = Mild slam try, 6+ hearts
2n-(p)-3d-(p)-3h-(p)-4n = Invitational to slam
2n-(p)-3d-(p)-3h-(p)-5n = Choice of slams

2n-(p)-3h-(p)-3s-(p)-3n = Exactly 5 spades, choice of games
2n-(p)-3h-(p)-3s-(p)-4c = 5+ spades, 4+ clubs, game forcing
2n-(p)-3h-(p)-3s-(p)-4d = 5+ spades, 4+ diamonds, game forcing
2n-(p)-3h-(p)-3s-(p)-4h = 5+ spades, 5+ hearts, choice of games
2n-(p)-3h-(p)-3s-(p)-4s = Mild slam try, 6+ spades
2n-(p)-3h-(p)-3s-(p)-4n = Invitational to slam
2n-(p)-3h-(p)-3s-(p)-5n = Choice of slams

---

## 2C Strong Opening Responses

2c-(p)-2d = Waiting, artificial, forcing to 2NT
2c-(p)-2h = Positive, 5+ hearts with KQ+, 8+ points
2c-(p)-2s = Positive, 5+ spades with KQ+, 8+ points
2c-(p)-2n = Positive, balanced
2c-(p)-3c = Positive, 5+ clubs with KQ+, 8+ points
2c-(p)-3d = Positive, 5+ diamonds with KQ+, 8+ points

---

## After 2C-2D Waiting

2c-(p)-2d-(p)-2h = 5+ hearts, forcing
2c-(p)-2d-(p)-2s = 5+ spades, forcing
2c-(p)-2d-(p)-2n = 22-24 HCP balanced
2c-(p)-2d-(p)-3c = 5+ clubs, forcing
2c-(p)-2d-(p)-3d = 5+ diamonds, forcing
2c-(p)-2d-(p)-3n = 25-27 HCP balanced

2c-(p)-2d-(p)-2n-(p)-3c = Stayman
2c-(p)-2d-(p)-2n-(p)-3d = Transfer to hearts
2c-(p)-2d-(p)-2n-(p)-3h = Transfer to spades

---

## Weak Two Responses

2h-(p)-2n = Artificial force, 15+ HCP
2h-(p)-3h = Preemptive raise, 3+ hearts, Law of Total Tricks
2h-(p)-4h = To play

2s-(p)-2n = Artificial force, 15+ HCP
2s-(p)-3s = Preemptive raise, 3+ spades, Law of Total Tricks
2s-(p)-4s = To play

2h-(p)-2n-(p)-3h = Minimum, no feature
2s-(p)-2n-(p)-3s = Minimum, no feature

---

## Reverse Drury (Passed Hand)

p-(p)-1h-(p)-2c = Drury, 3+ hearts, 11-12 total points
p-(p)-1s-(p)-2c = Drury, 3+ spades, 11-12 total points

p-(p)-1h-(p)-2c-(p)-2d = Full opener, inviting game
p-(p)-1h-(p)-2c-(p)-2h = Sub-minimum, no game interest
p-(p)-1h-(p)-2c-(p)-2s = 4+ spades, under 18 total points
p-(p)-1h-(p)-2c-(p)-2n = 5332, one-round force
p-(p)-1h-(p)-2c-(p)-3c = 4+ clubs, under 18 total points
p-(p)-1h-(p)-2c-(p)-3d = 4+ diamonds, under 18 total points
p-(p)-1h-(p)-2c-(p)-3h = 18+ total points, balanced
p-(p)-1h-(p)-2c-(p)-3s = 18+ total points, singleton spade
p-(p)-1h-(p)-2c-(p)-3n = 6322, one-round force
p-(p)-1h-(p)-2c-(p)-4c = 18+ total points, void club
p-(p)-1h-(p)-2c-(p)-4d = 18+ total points, void diamond
p-(p)-1h-(p)-2c-(p)-4s = 18+ total points, void spade
p-(p)-1h-(p)-2c-(p)-4h = To play

p-(p)-1s-(p)-2c-(p)-2d = Full opener, inviting game
p-(p)-1s-(p)-2c-(p)-2h = 4+ hearts, under 18 total points
p-(p)-1s-(p)-2c-(p)-2s = Sub-minimum, no game interest
p-(p)-1s-(p)-2c-(p)-2n = 5332, one-round force
p-(p)-1s-(p)-2c-(p)-3c = 4+ clubs, under 18 total points
p-(p)-1s-(p)-2c-(p)-3d = 4+ diamonds, under 18 total points
p-(p)-1s-(p)-2c-(p)-3h = 18+ total points, singleton heart
p-(p)-1s-(p)-2c-(p)-3s = 18+ total points, balanced
p-(p)-1s-(p)-2c-(p)-3n = 6322, one-round force
p-(p)-1s-(p)-2c-(p)-4c = 18+ total points, void club
p-(p)-1s-(p)-2c-(p)-4d = 18+ total points, void diamond
p-(p)-1s-(p)-2c-(p)-4h = 18+ total points, void heart
p-(p)-1s-(p)-2c-(p)-4s = To play

---

## Fourth Suit Forcing

1c-(p)-1d-(p)-1h-(p)-1s = Fourth suit forcing, artificial, game forcing
1c-(p)-1d-(p)-1h-(p)-2s = Natural, game forcing with spades

---

## New Minor Forcing

1c-(p)-1s-(p)-1n-(p)-2d = New minor forcing, asks about majors
1d-(p)-1s-(p)-1n-(p)-2c = New minor forcing, asks about majors
1c-(p)-1s-(p)-2n-(p)-3d = New minor forcing, 5+ spades, 7-12 total points
1d-(p)-1s-(p)-2n-(p)-3c = New minor forcing, 5+ spades, 7-12 total points

---

## RKCB (0314)

4n-(p)-5c = RKCB response: 0 or 3 keycards
4n-(p)-5d = RKCB response: 1 or 4 keycards
4n-(p)-5h = RKCB response: 2 or 5 keycards, no queen
4n-(p)-5s = RKCB response: 2 or 5 keycards, plus queen
4n-(p)-5n = RKCB response: even keycards plus unspecified void

---

## RKCB Queen Ask

# Next step after 5C/5D asks for queen of agreed suit

4n-(p)-5c-(p)-5d = Queen ask after 0/3 response
4n-(p)-5d-(p)-5h = Queen ask after 1/4 response

# Responses to queen ask: return to trump = no queen, other = queen + that king

---

## RKCB King Ask (5NT)

# 5NT after RKCB guarantees all keycards + queen, asks for kings

4n-(p)-5c-(p)-5n = King ask, all keycards accounted for
4n-(p)-5d-(p)-5n = King ask, all keycards accounted for
4n-(p)-5h-(p)-5n = King ask, all keycards accounted for
4n-(p)-5s-(p)-5n = King ask, all keycards accounted for

# Response: bid cheapest king below agreed suit, or 6 of suit with no outside king

---

## Gerber (over NT)

1n-(p)-4c-(p)-4d = Gerber response: 0 or 4 aces
1n-(p)-4c-(p)-4h = Gerber response: 1 ace
1n-(p)-4c-(p)-4s = Gerber response: 2 aces
1n-(p)-4c-(p)-4n = Gerber response: 3 aces

2n-(p)-4c-(p)-4d = Gerber response: 0 or 4 aces
2n-(p)-4c-(p)-4h = Gerber response: 1 ace
2n-(p)-4c-(p)-4s = Gerber response: 2 aces
2n-(p)-4c-(p)-4n = Gerber response: 3 aces

---

## DOPI (Over RKCB Interference)

4n-(x)-xx = DOPI: 0 keycards
4n-(x)-p = DOPI: 1 keycard

---

## Overcalls

(1c)-1d = One-level overcall, 5+ diamonds, 8-17 HCP
(1c)-1h = One-level overcall, 5+ hearts, 8-17 HCP
(1c)-1s = One-level overcall, 5+ spades, 8-17 HCP
(1d)-1h = One-level overcall, 5+ hearts, 8-17 HCP
(1d)-1s = One-level overcall, 5+ spades, 8-17 HCP
(1h)-1s = One-level overcall, 5+ spades, 8-17 HCP

(1c)-2d = Weak jump overcall, 6+ diamonds, 4-9 HCP
(1c)-2h = Weak jump overcall, 6+ hearts, 4-9 HCP
(1c)-2s = Weak jump overcall, 6+ spades, 4-9 HCP
(1d)-2h = Weak jump overcall, 6+ hearts, 4-9 HCP
(1d)-2s = Weak jump overcall, 6+ spades, 4-9 HCP
(1h)-2s = Weak jump overcall, 6+ spades, 4-9 HCP

---

## Takeout Doubles

(1c)-x = Takeout double, 3-5 diamonds, 3-4 hearts, 3-4 spades, 12+ total points
(1d)-x = Takeout double, 3-5 clubs, 3-4 hearts, 3-4 spades, 12+ total points
(1h)-x = Takeout double, support for unbid suits, 12+ total points
(1s)-x = Takeout double, support for unbid suits, 12+ total points
(1n)-x = Penalty double, 16+ HCP
(2h)-x = Takeout double, support for unbid suits
(2s)-x = Takeout double, support for unbid suits
(3c)-x = Takeout double, support for unbid suits
(3d)-x = Takeout double, support for unbid suits
(3h)-x = Takeout double, support for unbid suits
(3s)-x = Takeout double, support for unbid suits
(4h)-x = Takeout double, support for unbid suits

---

## Negative Doubles

# Through 3S level

1c-(1d)-x = Negative double, 4+ hearts, 4+ spades, 6+ HCP
1c-(1h)-x = Negative double, 4+ spades, 6+ HCP
1c-(1s)-x = Negative double, 4+ hearts, 6+ HCP
1c-(2d)-x = Negative double, both majors, 8+ HCP
1c-(2h)-x = Negative double, 4+ spades, 8+ HCP
1c-(2s)-x = Negative double, 4+ hearts, 8+ HCP

1d-(1h)-x = Negative double, 4+ spades, 6+ HCP
1d-(1s)-x = Negative double, 4+ hearts, 6+ HCP
1d-(2c)-x = Negative double, both majors, 8+ HCP
1d-(2h)-x = Negative double, 4+ spades, 8+ HCP
1d-(2s)-x = Negative double, 4+ hearts, 8+ HCP

1h-(1s)-x = Negative double, 4+ minor length, 6+ HCP
1h-(2c)-x = Negative double, 4+ diamonds or spade tolerance, 8+ HCP
1h-(2d)-x = Negative double, 4+ clubs or spade tolerance, 8+ HCP
1h-(2s)-x = Negative double, values, may have heart tolerance, 8+ HCP

1s-(2c)-x = Negative double, 4+ diamonds or heart tolerance, 8+ HCP
1s-(2d)-x = Negative double, 4+ clubs or heart tolerance, 8+ HCP
1s-(2h)-x = Negative double, values, may have spade tolerance, 8+ HCP

---

## Responsive Doubles

# Through 3S level - after partner overcalls or doubles

(1c)-1h-(2c)-x = Responsive double, both unbid suits, 8+ HCP
(1c)-1s-(2c)-x = Responsive double, both unbid suits, 8+ HCP
(1d)-1h-(2d)-x = Responsive double, both unbid suits, 8+ HCP
(1d)-1s-(2d)-x = Responsive double, both unbid suits, 8+ HCP
(1h)-1s-(2h)-x = Responsive double, both minors, 8+ HCP
(1h)-x-(2h)-x = Responsive double, both minors, 8+ HCP
(1s)-x-(2s)-x = Responsive double, both minors, 8+ HCP

---

## Support Doubles

# Through 2H level - opener shows exactly 3-card support

1c-(p)-1h-(1s)-x = Support double, exactly 3 hearts
1c-(p)-1h-(2c)-x = Support double, exactly 3 hearts
1c-(p)-1h-(2d)-x = Support double, exactly 3 hearts
1c-(p)-1s-(2c)-x = Support double, exactly 3 spades
1c-(p)-1s-(2d)-x = Support double, exactly 3 spades
1c-(p)-1s-(2h)-x = Support double, exactly 3 spades

1d-(p)-1h-(1s)-x = Support double, exactly 3 hearts
1d-(p)-1h-(2c)-x = Support double, exactly 3 hearts
1d-(p)-1h-(2d)-x = Support double, exactly 3 hearts
1d-(p)-1s-(2c)-x = Support double, exactly 3 spades
1d-(p)-1s-(2d)-x = Support double, exactly 3 spades
1d-(p)-1s-(2h)-x = Support double, exactly 3 spades

1h-(p)-1s-(2c)-x = Support double, exactly 3 spades
1h-(p)-1s-(2d)-x = Support double, exactly 3 spades
1h-(p)-1s-(2h)-x = Support double, exactly 3 spades

---

## Cappelletti (vs 1NT)

(1n)-x = Penalty, 16+ HCP
(1n)-2c = Cappelletti, single-suited hand, 10+ total points
(1n)-2d = Cappelletti, both majors (5-5), 11+ total points
(1n)-2h = Cappelletti, hearts + a minor, 11+ total points
(1n)-2s = Cappelletti, spades + a minor, 11+ total points

(1n)-2c-(p)-2d = Relay, asks for suit
(1n)-2c-(p)-2d-(p)-2h = Hearts
(1n)-2c-(p)-2d-(p)-2s = Spades
(1n)-2c-(p)-2d-(p)-2n = Clubs with 4 diamonds
(1n)-2c-(p)-2d-(p)-3c = Clubs
(1n)-2c-(p)-2d-(p)-3d = Diamonds

---

## Lebensohl

1n-(2s)-2n = Lebensohl relay, forces 3C
1n-(2h)-2n = Lebensohl relay, forces 3C
1n-(2d)-2n = Lebensohl relay, forces 3C

1n-(2s)-2n-(p)-3c = Forced by Lebensohl relay
1n-(2h)-2n-(p)-3c = Forced by Lebensohl relay
1n-(2d)-2n-(p)-3c = Forced by Lebensohl relay

1n-(2s)-3c = Lebensohl direct, 5+ clubs, game forcing
1n-(2s)-3d = Lebensohl direct, 5+ diamonds, game forcing
1n-(2s)-3h = Lebensohl direct, 5+ hearts, game forcing

1n-(2s)-2n-(p)-3c-(p)-3s = Lebensohl slow, 4+ hearts, stopper in spades (slow shows)

---

## Michaels Cue Bid

# vs Minor openings: shows both majors
(1c)-2c = Michaels, 5+ hearts, 5+ spades, 8+ HCP
(1d)-2d = Michaels, 5+ hearts, 5+ spades, 8+ HCP

# vs Major openings: shows other major + a minor
(1h)-2h = Michaels, 5+ spades, 5+ minor, 8+ HCP
(1s)-2s = Michaels, 5+ hearts, 5+ minor, 8+ HCP

# Asking for minor after Michaels vs major
(1h)-2h-(p)-2n = Asks for minor
(1h)-2h-(p)-2n-(p)-3c = Clubs
(1h)-2h-(p)-2n-(p)-3d = Diamonds
(1s)-2s-(p)-2n = Asks for minor
(1s)-2s-(p)-2n-(p)-3c = Clubs
(1s)-2s-(p)-2n-(p)-3d = Diamonds

# vs Weak 2M
(2h)-4h = Michaels, good hand, both minors
(2s)-4s = Michaels, good hand, both minors

---

## Unusual NT

# Shows two lowest unbid suits

(1c)-2n = Unusual NT, 5+ diamonds, 5+ hearts, 10+ HCP
(1d)-2n = Unusual NT, 5+ clubs, 5+ hearts, 10+ HCP
(1h)-2n = Unusual NT, 5+ clubs, 5+ diamonds, 10+ HCP
(1s)-2n = Unusual NT, 5+ clubs, 5+ diamonds, 10+ HCP

# vs Weak 2M (weaker version than Michaels)
(2h)-4n = Unusual NT, both minors, weaker than 4H Michaels
(2s)-4n = Unusual NT, both minors, weaker than 4S Michaels

# Vulnerability affects strength requirements

---

## UVU (Unusual vs Unusual)

# When opponents use Michaels or Unusual NT, lower cue = limit raise+

1h-(2h)-(p)-3c = UVU, limit raise or better in hearts (lower cue)
1h-(2h)-(p)-3s = UVU, natural, forcing
1s-(2s)-(p)-3h = UVU, limit raise or better in spades (lower cue)

1h-(2n)-(p)-3c = UVU, limit raise or better in hearts (lower cue)
1h-(2n)-(p)-3d = UVU, constructive raise in hearts (higher cue)
1s-(2n)-(p)-3c = UVU, limit raise or better in spades (lower cue)
1s-(2n)-(p)-3d = UVU, constructive raise in spades (higher cue)

---

## Sandwich 1NT

# By passed hand only, shows both unbid suits

p-(p)-(1c)-p-(1h)-1n = Sandwich 1NT, diamonds + spades, passed hand
p-(p)-(1c)-p-(1s)-1n = Sandwich 1NT, diamonds + hearts, passed hand
p-(p)-(1d)-p-(1h)-1n = Sandwich 1NT, clubs + spades, passed hand
p-(p)-(1d)-p-(1s)-1n = Sandwich 1NT, clubs + hearts, passed hand

---

## Truscott/Jordan 2NT

# After partner's opening is doubled, 2NT = limit raise or better

1c-(x)-2n = Jordan 2NT, limit raise or better in clubs
1d-(x)-2n = Jordan 2NT, limit raise or better in diamonds
1h-(x)-2n = Jordan 2NT, limit raise or better in hearts, 4+ support
1s-(x)-2n = Jordan 2NT, limit raise or better in spades, 4+ support

---

## Conventions NOT Used

# GIB does NOT play:
# - Gambling 3NT
# - Namyats
# - Bergen Raises
# - Reverse Bergen
# - DONT
# - Puppet Stayman

---

## System Summary

# 5-card majors
# 15-17 1NT, 20-21 2NT
# 2/1 Game Force
# Strong artificial 2C (22+)
# Weak twos (disciplined)
# Soloway jump shifts
# RKCB 0314
# Reverse Drury (passed hand)
# Lebensohl (slow shows stopper)
# Cappelletti (2C = single suited)
# Jacoby 2NT (shortness showing)

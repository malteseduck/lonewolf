# Fight balance: findings and options

Not built and not decided: what was found on 2026-11-01, kept for the owner to decide on later. The engine
still applies the books' table and rules, with the Combat Ratio capped at +10 (ruling R1). Whatever is chosen
would be a house rule: a new ruling, with `rules-books.md` and `rules-engine.md` updated. The Sommerswerd has
its own options in `sommerswerd-options.md`.

## The problem

Fights feel too easy: lesser enemies fall in a round or two, with no need for Mindblast or potions. The owner
wants lesser enemies to take a few rounds and need some healing, and big bosses to need more strategy.

## The table is right, and generous

The engine's Combat Results Table matches the printed one cell by cell (Book 1, read again 2026-11-01). Books
13-28 print the same table in the same images, 21-28 relabelled; Books 2-12 and 29 have no image under those names
and were not re-read. The Random Number is an even 0-9. The simulator's win rates match exact odds worked out from
the table (at ratio -6, foe ENDURANCE 30, his 25: 50.4% both ways), so the ease comes from the books' numbers.

Average ENDURANCE lost in a round, with a killing blow on a foe counted as 20:

| Ratio | Foe loses | He loses | Killed outright |
|---|---|---|---|
| -12 | 2.1 | 4.1 | 20% of rounds |
| -10 | 2.8 | 4.6 | 10% |
| -8 | 3.6 | 4.6 | |
| -6 | 4.5 | 3.5 | |
| -4 | 5.5 | 3.0 | |
| -2 | 6.5 | 2.6 | |
| 0 | 7.5 | 2.1 | |
| +2 | 8.6 | 2.0 | |
| +4 | 9.8 | 1.7 | |
| +6 | 11.1 | 1.5 | |
| +8 | 12.5 | 1.4 | |
| +10 | 13.8 | 1.3 | |

The exchange only turns even at about -7. At an even fight he deals over three times what he takes.

Median first-round ratio, typical hero, no Sommerswerd: Kai +2, Magnakai 0, Grand Master +3, New Order +9.

## What changes do across every fight

All 1035 fights of Books 1-29, each alone from full ENDURANCE, about 150 trials a fight, a typical hero with no
Sommerswerd. Each cell is lives % / ENDURANCE lost as % of his / rounds.

| Rule | Kai | Magnakai | Grand Master | New Order |
|---|---|---|---|---|
| The engine | 91 / 32 / 3.8 | 70 / 62 / 4.4 | 91 / 37 / 5.1 | 99 / 22 / 3.7 |
| Foes' COMBAT SKILL +3 | 83 / 44 / 4.3 | 56 / 71 / 4.5 | 83 / 47 / 5.6 | 96 / 27 / 4.3 |
| Foes' COMBAT SKILL +5 | 75 / 54 / 4.5 | 46 / 78 / 4.6 | 76 / 53 / 5.9 | 93 / 32 / 4.7 |
| Foes' ENDURANCE 150% | 85 / 42 / 5.1 | 57 / 73 / 5.5 | 87 / 46 / 6.8 | 97 / 28 / 5.0 |
| His losses 150% | 85 / 41 / 3.6 | 62 / 67 / 4.0 | 87 / 43 / 4.8 | 97 / 26 / 3.7 |
| Foes' losses 70% | 85 / 42 / 5.1 | 56 / 73 / 5.5 | 86 / 46 / 7.0 | 97 / 29 / 5.1 |
| His 150%, foes' 70% | 76 / 52 / 4.7 | 47 / 77 / 4.9 | 80 / 52 / 6.5 | 94 / 34 / 5.0 |

A blanket change hurts Magnakai long before New Order feels it, so one number for every fight does not suit.

## Recommended to try: lesser enemies and bosses apart

Bosses here are the top tenth of each book's fights by foe strength (the highest COMBAT SKILL plus half the
ENDURANCE of all its foes): 115 bosses, 920 lesser. Typical hero, about 80 trials a fight, cells as above.

| | The engine | His losses 150%; bosses also ENDURANCE 200% |
|---|---|---|
| Lesser, Sommerswerd | 98 / 21 / 3.0 | 97 / 26 / 3.0 |
| Lesser, no Sommerswerd | 91 / 34 / 4.0 | 87 / 40 / 3.8 |
| Boss, Sommerswerd | 80 / 51 / 5.7 | 52 / 75 / 8.3 |
| Boss, no Sommerswerd | 56 / 70 / 6.6 | 27 / 88 / 7.8 |

What his choices do to a boss under that rule, lives %:

| | Mind at rest | Mind in use | In use, 3 Laumspur, drunk at 8 |
|---|---|---|---|
| Sommerswerd | 30 | 52 | 61 |
| No Sommerswerd | 11 | 27 | 31 |

With the Sommerswerd this is close to what the owner described: lesser enemies about 3 rounds at about a quarter
of his ENDURANCE, bosses about 8 rounds where his choices count. Without it, bosses are too harsh, so the numbers
need tuning. Other mixes tried, Sommerswerd, boss lives % / rounds with the mind in use: ENDURANCE 300% and his
losses 150%, 37 / 9.7; ENDURANCE 200% and his losses 200%, 40 / 7.1 (lesser at 200%: 95 / 32 / 2.9).

Laumspur is weak in itself: each heals 4, so three add little even in a long fight (under the engine's rules, no
Sommerswerd, boss lives rise only from 56% to 62%). Making potions matter may need a change to them too.

## To settle when revisiting

- **What makes a boss**: a rule by strength, as above, or a hand-marked list per book. Spec principle 2 (automate
  only what is certain) leans to the list, or to the rule with a hand correction.
- **Whole books**: every figure is one fight from full ENDURANCE. Lesser fights at a quarter each may add up to too
  much with only +1 a section back, so test with Node play-throughs (ADR 0036) before settling numbers.
- **Tactics**: the simulator's hero follows one fixed plan, so a player would do somewhat better.
- **The series differ**: whether the numbers should differ by series, since Magnakai is hardest and New Order easiest.
- **Ruling R1**: whether the +10 cap should stay, or go lower.
- **The Sommerswerd**: which of `sommerswerd-options.md` goes with this; the "with" columns above use the books' +8.
- **By the book**: whether to offer an option to play with the books' rules.

## To see it for yourself

The dashboard's All fights sheet (`dashboard.md`) tries most of these, on one fight or all shown. Its trial rules
apply to every foe alike, so the lesser and boss split needs adding to it first (`tools/admin/fightlab.js`). The
figures above came from a one-off Node script over `fightlab.js`, kept nowhere.

# 0047. The New Order series: always a new Kai, five disciplines at first, the Kai Weapon marked with a by-hand control

- Status: Accepted
- Date: 2026-10-31

## Context

Books 21 on have a hero of the player's own. Book 21's rules pages and the Readers' Handbook's generic
New Order pages differ, and both leave points open. The owner settled these before the engine work.

The Handbook's rank table starts at 4 disciplines, but Book 21 gives 5, and only 5-16 fits its 12
ranks and its 16 disciplines. The Handbook gives Grand Weaponmastery with Bow +3 and says the
Collector's Editions give +5; Book 21's rules page and every bow shot that names a number there say
+5. The Handbook's page lets a character from any earlier book carry in, while Book 21 has Lone Wolf
as the hero's mentor and says Books 1-20 are not needed. Book 21 offers an exchange into another
currency, but none of its sections uses any coin but the Gold Crown.

## Decision

- **Always a new Kai.** A New Order hero is rolled new for the series: nothing comes in from Books
  1-20, and Lone Wolf stays in the story as the mentor.
- **Rank**: a hero sets out with 5 disciplines, as Kai Grand Master Senior. The 12 ranks run from 5
  disciplines to 16.
- **Grand Weaponmastery with Bow** is +5. A section that gives its own number has that number in place
  of the +5, never as well, as ruling R10 has it for the Grand Master books.
- **Deliverance** is used once a book, as ruling R9 has it for the Grand Master books.
- **The Kai Weapon's higher bonus**: the item table marks a fight where the text clearly says it
  qualifies (the foe's kind, the time, the place), and the engine then applies the bonus. A control on
  the fight's panel lets the player claim it where the text does not say.
- **From one New Order book to the next**: disciplines and their bonuses, the Kai Weapon, Weapons,
  Special Items, Backpack Items and gold (the new pouch added on, 50 at most). Meals do not carry.
- **Other currencies** are not tracked in Book 21. A later book that uses one gets its own decision.
- **Other coins share the Belt Pouch** (2026-11-03, for Books 22 on, and the coins of earlier books
  with them): 50 Gold Crowns' worth in all, each coin at its rate to the Crown (Lune 4, Kika 10, Ren 10, Torqs 4,
  Nobles 1). Each coin is kept apart; a gain past the cap is cut. The Action Chart shows one figure, the
  worth of them all in Gold Crowns rounded down; hovering lists the coins, touching opens each with its
  own stepper. A price is paid only in the coin it names; where the text gives a price in Gold Crowns
  too, either pays. Exchanging is by hand. (This replaces the reading of 2026-11-02 that took Book
  22's Nobles as Gold Crowns.)

## Consequences

- `docs/reference/rules-books.md` holds the New Order rules and marks these as the owner's.
- ADR 0011's rules for carrying from an earlier series do not apply on entering the New Order, as
  nothing comes in; its Meals rule is followed within the series.
- A New Order hero keeps his or her own adventure, as another Lone Wolf does now.


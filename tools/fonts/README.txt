Fonts for tools/map_letter.py, which letters the map labels Gemini could not be trusted with. A map's
maps/<code>/font.txt names its font (ADR 0004); a map without one gets Cabin SemiBold.

Cabin (Cabin; SemiBold is used): Pablo Impallari and the Cabin Project Authors, a
humanist sans after Gill Sans. The default for every map. From github.com/impallari/Cabin,
2026-10-07, under the SIL Open Font License 1.1 (OFL-Cabin.txt).

IM Fell English (IMFeENrm28P, IMFeENit28P, IMFeENsc28P): Igino Marini's revival of the Fell types.
Almendra (Almendra-Regular): Ana Sanfelippo. Not used yet; an alternative hand for the small names.
Both from github.com/google/fonts (ofl/imfellenglish, ofl/imfellenglishsc, ofl/almendra),
2026-10-06, under the SIL Open Font License 1.1 (OFL-IMFell.txt, OFL-Almendra.txt).

Architects Daughter (ArchitectsDaughter-Regular): Kimberly Geswein. Book 12's first hand font, chosen over
Patrick Hand, Kalam, Neucha and Comic Neue as the closest to the scan's thin marker; replaced by
Darkland Hand (2026-10-16) and no longer named by any map. From github.com/google/fonts
(ofl/architectsdaughter), 2026-10-10, under the SIL Open Font License 1.1 (OFL-ArchitectsDaughter.txt).

Darkland Hand (DarklandHand-Thin, -Light, -Regular, -Bold): our own, drawn by tools/map_font.py in
straight chisel-pen strokes after the hand that letters the printed maps of Books 12 and 13 (no free
font had its angular capitals with lower case). Not traced from the scans. Regular is
named by the maps of Books 11, 12 and 13 (their font.txt); Thin, Light and Bold are kept for trials. Rebuild with `python tools/map_font.py`, 2026-10-16,
under the SIL Open Font License 1.1 (OFL-DarklandHand.txt).

Darkland Serif (DarklandSerif-Thin, -Light, -Regular, -Bold): our own, built by the same script from
Darkland Hand's nib, after the broad-pen hand of Book 9's printed map: still angular, with wedge
serifs, rounded-diamond bowls and exit flicks on the lower case. Not traced from the scan. Regular is named by the maps of Books 9 and 10. 2026-10-20, under the SIL Open
Font License 1.1 (OFL-DarklandHand.txt covers both).

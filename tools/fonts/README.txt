Fonts for tools/map_letter.py, which letters the map labels Gemini could not be trusted with.

IM Fell English (IMFeENrm28P, IMFeENit28P, IMFeENsc28P): Igino Marini's revival of the Fell types.
Almendra (Almendra-Regular): Ana Sanfelippo. Not used yet; an alternative hand for the small names.
Both from github.com/google/fonts (ofl/imfellenglish, ofl/imfellenglishsc, ofl/almendra),
2026-10-06, under the SIL Open Font License 1.1 (OFL-IMFell.txt, OFL-Almendra.txt).

Architects Daughter (ArchitectsDaughter-Regular): Kimberly Geswein. Named by maps/12tmod/font.txt,
since Book 12's map is lettered by hand (a map's font.txt sets its font: docs/adr/0006). Chosen over Patrick Hand, Kalam, Neucha
and Comic Neue as the closest to the scan's thin marker. From github.com/google/fonts
(ofl/architectsdaughter), 2026-10-10, under the SIL Open Font License 1.1 (OFL-ArchitectsDaughter.txt).

Darkland Hand (DarklandHand-Thin, -Light, -Regular, -Bold): our own, drawn by tools/map_font.py in
straight chisel-pen strokes after the hand that letters the printed maps of Books 12 and 13 (no free
font had its angular capitals with lower case). Not traced from the scans. Named by
maps/12tmod/font.txt in Thin, which matches Book 12's stroke weight once map_letter.py's added stroke
is counted; Bold is the weight of Book 13's pen. Rebuild with `python tools/map_font.py`, 2026-10-16,
under the SIL Open Font License 1.1 (OFL-DarklandHand.txt).

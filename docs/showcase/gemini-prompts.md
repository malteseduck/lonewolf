# Prompts for finer showcase art (Gemini)

The showcase's made-up art is the demo book's (`demo/99ember/`) or borrowed from public-domain
engravings. These prompts are for painting richer versions to swap in. None names a living artist or a book.
Give Gemini the picture named in "Reference" where there is one, and keep any text exactly as listed.

## The map (4:3, 3840 x 2880)

Reference: `images/45-emberlands-map.jpg` (and `images/33-stage-4-letter.jpg` for the lettering, if you
want to repaint from the lettered stage rather than from scratch).

> Repaint this fantasy map as an aged hand-painted parchment map, as if drawn in ink and watercolour in the
> 1980s for a fantasy adventure book. Keep the coastline, the island on the left, every symbol and every place
> name exactly where it is and spelled exactly as given: THE EMBERLANDS, The Quiet Sea, Gloamwater, The Ashen
> Reach, Cairn Peaks, Vale of Hollin, Ashgrove, The Cinder Wastes, Thornwick, Brindle Cross, Saltmere, Marrow
> Ford, Old Emberhold. Paint the sea in deep teal washes with faint wave lines along the coasts, the lowlands
> in soft greens, the south as dry ochre waste, the hills and mountains hatched in brown ink with pale snow on
> the highest peaks, the forests as clusters of round dark-green trees with small trunks, tiny red-roofed
> towns with a tower and a flag, and a few small sailing ships. Add a compass rose bottom right, a ruled double
> border with corner blocks, paper grain, foxing spots, creases and darker burnt edges. No modern elements,
> no extra labels, no new places, no people.

## The "printed scan" (stage 1), for the before picture (4:3, 1024 x 768)

Reference: `images/30-stage-1-scan.jpg`.

> Make this look like a flat, low-resolution scan of a printed fantasy map: pale cream land, pale grey-blue
> sea, thin black linework, small hand-lettered names, a slight softness and paper noise. Keep every shape
> and name where it is.

## "Gemini alone" (the middle comparison picture)

> Repaint this map richly, but keep the lettering exactly as it is. (Then, on the result, ask Gemini to
> re-letter four of the names slightly wrong, for example Thornwick, Brindle Cross, Saltmere and Cairn Peaks,
> to show the failure. Say in the slide that the misspellings are staged.)

## The story illustration (portrait, about 842 x 1230)

> A black-and-white pen-and-ink gamebook illustration in the style of a 1980s British fantasy adventure book:
> a lone traveller in a hooded cloak seen from behind, standing on a muddy road at dusk before a squat stone
> gatehouse whose iron portcullis is half raised, dark marsh and reeds behind, a thread of smoke above the
> wall. Dense cross-hatching, strong blacks, no colour, no text, plain white background, a ruled frame is not
> needed.

## Foes for the fight sheet (portrait, black ink on plain white, no text, no frame)

Draw each as a tall pen-and-ink illustration in the same 1980s gamebook style, the creature keeping its own
body, shown whole.

- **Ashmaw**: an ash-grey hunting hound the size of a pony, slinking out of the shadow under an iron
  portcullis, ribs showing, teeth bared.
- **Hollin Bear**: a shaggy brown bear, gaunt from a hard winter, rearing on a forest road at dusk.
- **Marrow Eel**: a long black water-snake coiled in a ford, head raised from the shallows.
- **Reed Cat**: a thick-furred marsh cat with a heavy jaw, crouched in reeds at night.
- **Gate Imps**: a shrieking tangle of small imps clinging to a gatehouse arch after dark.
- **Whip-masters**: winged drivers cracking long whips over a road crew of bent labourers.
- **Hunt Hounds**: a pack of lean hounds that has pulled down a stag, turning on the viewer.
- **Web-weaver**: a spider as big as a cart-wheel slung in the broken stairwell of a ruined tower.
- **Gloam-weed**: living pale weed rising from black shallows and reaching for an ankle.
- **Warden's Shade**: a gaunt shape behind a cell door, one hand through the bars holding a ring of keys.

## The demo book's printed map, made in Book 1's style (becomes `map.png`, ruling R20)

Attach **A** `data/demo/emberlands-lowres.png` (the layout and the names) and **B** `data/projectaon/01fftd/map.png`
(the style only; never committed or shown). Save the result as `data/demo/emberlands-gemini.png`; it stands in
for the book's printed scan, so it should be roughly 1000 px wide and slightly soft, as the Project Aon scans are.

> Make a new printed fantasy-book map, about 1024 pixels wide, 4:3, a little soft like a scan of a printed page.
> Picture B shows the exact look wanted: aged yellow parchment with ragged, burnt, scorched edges; a striped
> red, blue and cream painted border down the sides; a scroll cartouche at the top with the title in black
> capitals; heraldic banners and a boxed key in the top corners; land in soft watercolour (green plains and
> hills, pale ochre waste, brown hatched mountains with grey crags, scattered individually drawn dark-green
> trees, thin blue rivers); small red-roofed castles and towns with flags; pale blue sea fading to white near
> the coast, small tall-masted ships and a compass rose in the water; black hand-lettered names. Use B for the
> style only: copy none of its geography, names, banners or text. The land to draw is the one in picture A:
> keep its coastline, the island on the left and every place where it is. Title the map THE EMBERLANDS and
> letter exactly these names, spelled exactly like this and nothing else: The Quiet Sea, Gloamwater, The Ashen
> Reach, Cairn Peaks, Vale of Hollin, Ashgrove, The Cinder Wastes, Thornwick, Brindle Cross, Saltmere, Marrow
> Ford, Old Emberhold. The banners and key hold only made-up emblems (a flame, a tower, a crescent) and the
> key's words Plains, Wasteland, Hills, Mountains, Forest. No people, no modern elements.

/* Book 6's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Nothing new in the fields. Notes on this book:
     - The first Magnakai book: bow shots (bowShot) are marked where the draw is the shot itself, with
       the ranges for the total the engine builds (Weaponmastery with Bow added). Where a shot has no
       draw (a plain hit that only costs an Arrow) the section takes the Arrow instead.
     - Where the text lets the player shoot "if you have a Bow", the choice is gated on any bow (the
       Bow, or the prize bow once won).
     - The prize Silver Bow is called a Special Item in the text, but the engine reads a bow's bonus
       to a shot only from the weapons carried, so it is entered as a weapon (it takes a weapon place).
     - The archery tournament (26, 340 and the borrowed bows) is not a fight the engine plays: its
       draws and its Target points are left as by-hand notes. So is the wager game at 284 and the
       conundrum bet at 245.
     - Bribes, fees and the Amory cess are paid at the choice that pays them (need ... spend). Lodging
       at 17 can also be paid with goods (a footnote), so it is left as a note, not a gate.
     - Where only some rounds of a fight change (a first-round bonus, two rounds of surprise) the
       fight is left as a note: the engine's csMod covers the whole fight.
   Item names are the book's own labels for them; everything else is in our words. */
export const ITEMS = {
  mapVaretta: { name: 'Map of Varetta', kind: 'special', glyph: 'treasure-map', about: 'The streets of the city of Varetta, with the way to Brass Street marked.' },
  mapTekaro6: { name: 'Map of Tekaro', kind: 'backpack', glyph: 'treasure-map', about: 'A plan of the besieged city. It helps in its sewers.' },
  mapLuyen6: { name: 'Map of Luyen', kind: 'backpack', glyph: 'treasure-map' },
  mapSommerlund6: { name: 'Map of Sommerlund', kind: 'backpack', glyph: 'treasure-map' },
  ticketLuyen6: { name: 'Ticket to Luyen', kind: 'special', glyph: 'ticket', about: 'A passage on the riverboat from Soren. It costs nothing to keep.' },
  ticketRhem6: { name: 'Ticket to Rhem', kind: 'special', glyph: 'ticket', about: 'A passage on the riverboat from Soren.' },
  ticketEula6: { name: 'Ticket to Eula', kind: 'special', glyph: 'ticket', about: 'A passage on the riverboat from Soren, all the way to Eula.' },
  cess6: { name: 'Cess', kind: 'special', glyph: 'id-card', about: 'A card that lets you into the town of Amory for the one day it is dated.' },
  silverBrooch6: { name: 'Silver Brooch', kind: 'special', glyph: 'gem-pendant', about: 'Taken from a dead hired killer. It marks her kin.' },
  rubyRing6: { name: 'Ruby Ring', kind: 'special', glyph: 'diamond-ring', about: 'Worth money to the right buyer.' },
  smallSilverKey6: { name: 'Small Silver Key', kind: 'special', glyph: 'skeleton-key', about: 'Opens the tomb in Tekaro cathedral where the Lorestone lies.' },
  brassWhistle6: { name: 'Brass Whistle', kind: 'special', glyph: 'whistle' },
  silverBow: { name: 'Silver Bow of Duadon', kind: 'weapon', ranged: true, shot: 3, weapon: ['bow'], glyph: 'pocket-bow', about: 'The tournament prize: +3 to the number for every bow shot, on top of Weaponmastery with Bow. Useless hand to hand.' },
  boninWarhammer: { name: 'Bronin Warhammer', kind: 'weapon', weapon: ['warhammer'], cs: 1, glyph: 'warhammer', about: 'A bronze-bright hammer that never tarnishes: +1 COMBAT SKILL when you fight with it.' },
  laumspur3: { name: 'Potion of Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 3, about: 'A smaller dose than usual. Drink it after a fight.' },
  taunorWater6: { name: 'Taunor Water', kind: 'backpack', glyph: 'round-bottom-flask', heal: 6, about: 'Spa water in a glass jar, from Castle Taunor: restores 6 ENDURANCE. Drink it now or keep it.' },
  graveweed6: { name: 'Graveweed Concentrate', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Deadly if swallowed.' },
  alletherBerries6: { name: 'Alether Berries', kind: 'backpack', glyph: 'herbs-bundle', about: 'A handful swallowed before a fight: +2 COMBAT SKILL for that fight, and no more than one handful in any one fight. Apply it by hand.' },
  wine6: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  mirror6: { name: 'Mirror', kind: 'backpack', glyph: 'mirror-mirror' },
};

const bows = ['bow', 'silverBow'];
// "if you have a Bow" gating the way to a shot, and the way without
const withBow = (to, other) => ({ [to]: { item: bows }, ...(other ? { [other]: { item: bows, not: true } } : {}) });
const pay = (gold) => ({ gold, spend: true });
const cess = { item: 'cess6' };
const map = { item: 'mapVaretta' };
// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
// the number drawn plus a fixed sum is the Crowns won
const win = (add) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], gold: n + add }));
const taunor = { loot: [{ item: 'taunorWater6' }] };
const meals = (n) => Array.from({ length: n }, () => ({ item: 'meal' }));

export const SECTIONS = {
  // the apothecary of Luyen
  2: { loot: [{ item: 'potion', cost: 5 }, { item: 'gallowbrush', cost: 2 }, { item: 'rendalim', cost: 7 }, { item: 'alether', cost: 4 }, { item: 'graveweed6', cost: 4 }] },
  3: { loot: [{ item: 'torch' }] },
  // the weapon is lost to the strands: the player picks which when he carries two
  4: { take: [{ weapons: 'one' }] },
  5: { need: { 141: { gold: 2 } } },
  8: { loot: [{ gold: 10 }, { item: 'laumspur3' }] },
  9: { need: { 332: pay(10) } },
  // a ticket for each of the three stops; the price is for that stop
  10: { loot: [{ item: 'ticketLuyen6', cost: 10 }, { item: 'ticketRhem6', cost: 15 }, { item: 'ticketEula6', cost: 20 }], todo: 'buy one ticket only: the price depends on how far you go.' },
  12: { todo: 'the shot has brought it down: do not take off any ENDURANCE you lose in the first two rounds. You may break off at any time.' },
  13: { need: { 56: { item: bows } } },
  // the map is handed over, however he came by it
  16: { give: [map] },
  17: { todo: 'a night costs 2, 3 or 5 Gold Crowns for the dormitory, a room, or a room with a bath: pay it off your gold by hand, or hand over a Backpack Item or a Weapon instead.' },
  20: { take: [{ arrows: 1 }] },
  24: { need: { 101: { item: 'rope' } } },
  26: { todo: 'the final is fought by the usual combat rules, but with 50 TARGET points on each side in place of ENDURANCE, and no Arrows are spent. Play it with the Combat page and keep your own ENDURANCE untouched; with the Jakan, a 0 drawn ends it at once (turn to the section the text names).' },
  27: { need: { 304: pay(3) } },
  30: { need: { 230: pay(8) } },
  // a purse: the number drawn plus 5
  34: { rolls: win(5) },
  // the rats eat every Meal in the Backpack
  35: { take: meals(8) },
  37: { ep: -12 },
  40: { loot: [{ gold: 27 }, { item: 'wine6' }, { item: 'mirror6' }] },
  44: { ep: -2 },
  48: { loot: [{ gold: 5 }, { item: 'mapTekaro6' }] },
  // the guard keeps the card
  49: { take: [cess] },
  // the wager goes by the stake written down at 245
  50: { todo: 'you were wrong: take the Gold Crowns you staked off your gold.' },
  51: { ep: -2 },
  54: { ep: -2 },
  // he is struck down by the bolt; the number drawn is the wound, 0 counting as 10
  56: { take: [{ arrows: 1 }], rolls: loss() },
  62: { todo: 'you were right: add as many Gold Crowns as you staked to your gold.' },
  // the glass jar of spa water
  65: taunor,
  76: { todo: 'the mercenary buys only these, at: Sword 3, Dagger 1, Broadsword 6, Short Sword 2, Mace 3, Ruby Ring 10, Warhammer 5, Spear 4, Axe 2, Bow 5, Quarterstaff 2, Silver Brooch 7 Gold Crowns. You need 2 Crowns for the night. Adjust your things and gold by hand.' },
  78: { todo: 'the text stops the fight once Roark is down to 11 ENDURANCE or less and sends you to 180; the page fights on, so take 180 after the fight and give back (Endurance +) what you lost after that round.' },
  85: { ep: -2, need: withBow('178', '39') },
  88: { give: [{ gold: 5 }] },
  91: { rolls: win(5) },
  // an arrow shot: 0-3 miss the creature, 4 or more hit
  95: { bowShot: { 155: [0, 3], 12: [4, 12] } },
  96: { need: { 49: cess, 221: { ...cess, not: true } } },
  // the weapons shop: prices as chalked up; he buys back at a crown less
  98: { loot: [{ item: 'broadsword', cost: 7 }, { item: 'dagger', cost: 2 }, { item: 'shortSword', cost: 3 }, { item: 'warhammer', cost: 6 }, { item: 'spear', cost: 5 }, { item: 'mace', cost: 4 }, { item: 'axe', cost: 3 }, { item: 'bow', cost: 7 }, { item: 'quarterstaff', cost: 3 }, { item: 'sword', cost: 4 }, { arrows: 2, cost: 1 }],
    todo: 'the owner buys your weapons for 1 Gold Crown less than the price shown, and Arrows at 4 for 1 Crown: do that by hand.' },
  106: taunor,
  109: { loot: [{ item: 'mapTekaro6' }] },
  111: { loot: [{ item: 'potion' }] },
  112: taunor,
  113: { todo: 'you were wrong: take the Gold Crowns you staked off your gold.' },
  114: { todo: 'you took him by surprise: add 2 to your COMBAT SKILL for the first round only.' },
  123: { loot: [{ item: 'alletherBerries6', cost: 3 }], todo: 'buy at most 3 handfuls.' },
  // a ticket from Soren, of any of the three kinds, takes the first way
  124: { need: { 59: { item: ['ticketLuyen6', 'ticketRhem6', 'ticketEula6'] }, 290: { item: ['ticketLuyen6', 'ticketRhem6', 'ticketEula6'], not: true } } },
  137: { need: { 332: pay(3) } },
  139: { loot: [{ item: 'axe' }, { gold: 11 }, { item: 'dagger' }, { item: 'silverBrooch6' }] },
  // the entrance fee is paid on arrival; he must have a bow of his own to enter
  141: { take: [{ gold: 2 }], need: withBow('340', '18') },
  144: { todo: 'a thief took one Backpack Item of your choice in the night: drop it in the inventory.' },
  145: { loot: [{ gold: 12 }, { item: 'rubyRing6' }] },
  153: { ep: -5, need: withBow('178', '39') },
  155: { todo: 'the first round is bare-handed: take 4 off your COMBAT SKILL for that round only, then you may draw a weapon. Evasion is allowed only after you survive 4 rounds, whatever the Evade control shows.' },
  157: { ep: 1, loot: [{ meal: 1 }, { meal: 1 }] },
  // the cellar: Gwynian gives the key, and the rest is for the taking
  158: { give: [{ item: 'smallSilverKey6' }], loot: [{ item: 'quarterstaff' }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { item: 'mace' }, { item: 'brassWhistle6' }, { item: 'rope' }, { item: 'shortSword' }] },
  160: { give: [{ item: 'cess6' }] },
  162: { need: withBow('198', '343') },
  164: { ep: -2 },
  165: { need: { 16: pay(5) } },
  // the jump scatters two things from the pack
  166: { todo: 'two Backpack Items of your choice fell out: drop them in the inventory.' },
  // a bow shot at the pirate on a heaving deck; Huntmastery adds 1 to the total
  170: { bowShot: { 23: [-99, 5], 265: [6, 99] }, rntMod: [{ disc: 'huntmastery', plus: 1 }] },
  // food, then the key to the room
  172: { take: [{ gold: 5 }] },
  174: { ep: -5 },
  178: { bowShot: { 296: [-99, 7], 303: [8, 99] } },
  187: { ep: -3 },
  188: { need: { 31: { item: 'silverBrooch6' }, 14: { item: 'silverBrooch6', not: true } } },
  190: taunor,
  197: { ep: -2 },
  201: { todo: 'if you win in 3 rounds or fewer, go to the first way on; if it takes longer, to the second (use the Turn to section box).' },
  202: { ep: 1 },
  // swords drawn: the hammer is cut from the corpse with a rope, or by will
  207: { loot: [{ item: 'boninWarhammer' }] },
  209: { take: [{ arrows: 1 }] },
  211: { need: { 17: map, 104: { ...map, not: true } } },
  // two Special Items or 20 Gold Crowns, or the prize bow, for the horse
  212: { todo: 'pay for the horse: the Silver Bow if you came here from the tournament, otherwise 2 Special Items or 20 Gold Crowns. Take it off your things by hand.' },
  214: { todo: 'the bone bow costs you 4 COMBAT SKILL for the whole contest, the final included.' },
  219: { need: withBow('301', '78') },
  220: { todo: 'put in as many Gold Crowns as you like and take them off your gold by hand.' },
  222: { ep: -12 },
  223: { todo: 'you were wrong: take the Gold Crowns you staked off your gold.' },
  224: { need: withBow('170') },
  227: { need: withBow('20') },
  196: { need: withBow('20') },
  // the room key and the Meal, paid in advance
  232: { take: [{ gold: 3 }] },
  74: { need: withBow('20') },
  245: { todo: 'write down how many Gold Crowns you wager before you choose.' },
  246: taunor,
  249: { need: { 235: { item: 'mapTekaro6' } } },
  // a hot bath and a good night
  251: { ep: 3 },
  // the prize: the bow adds 3 to every shot
  252: { give: [{ item: 'silverBow' }] },
  // the stable keeps the room, the horse and a meal at 3 Crowns; eating the Meal is yours to settle
  253: { need: { 35: pay(3) }, todo: 'you must eat now: a Meal from your Backpack, a meal bought here for 1 Gold Crown, or lose 3 ENDURANCE (Huntmastery spares you).' },
  254: { todo: 'unless you have Huntmastery, take 2 off your COMBAT SKILL for the first round only.' },
  // a bow shot at the beast's eyes
  243: { bowShot: { 155: [0, 3], 292: [4, 8], 264: [9, 12] } },
  266: { ep: 1 },
  268: { bowShot: { 155: [0, 5], 236: [6, 8], 75: [9, 12] } },
  270: { fight: { undead: true }, todo: 'unless you have Huntmastery, take 2 off your COMBAT SKILL for the first two rounds only; unless you have Nexus, take 2 ENDURANCE off in every round (the cold). Both by hand.' },
  273: { need: { 304: pay(3) } },
  // the map seller
  275: { loot: [{ item: 'mapSommerlund6', cost: 5 }, { item: 'mapTekaro6', cost: 4 }, { item: 'mapLuyen6', cost: 3 }] },
  276: { loot: [{ item: 'boninWarhammer' }] },
  278: { ep: -3, need: withBow('198', '343') },
  282: { ep: -1 },
  // a bet on the rider's feat, up to three rounds, 10 Crowns at most
  284: { todo: 'the wager game is played by hand: stake up to 10 Gold Crowns, draw a number, then draw another and add 3; if the first is higher you win twice your stake, if the second is higher you lose it. Up to three rounds. Add or take off the gold yourself.' },
  295: { need: { 321: { item: 'sommerswerd' } } },
  298: { todo: 'the Jakan costs 2 COMBAT SKILL for the whole contest, and it breaks if you draw a 0 with it: remember that for the final.' },
  301: { take: [{ arrows: 1 }] },
  304: { give: [{ item: 'cess6' }] },
  // the cold costs a point unless Nexus spares it
  306: { todo: 'unless you have Nexus, lose 1 ENDURANCE.' },
  171: { todo: 'unless you have Nexus, lose 1 ENDURANCE.' },
  // loaves at 2 Crowns, each one a Meal; the forced Meal comes after the buying, not before
  307: { meal: false, loot: [{ meal: 1, cost: 2 }], todo: 'buy loaves if you like, then eat a Meal or lose 3 ENDURANCE (Huntmastery spares you).' },
  313: { ep: -8 },
  315: { ep: -4 },
  322: { need: { 332: pay(10) } },
  328: { take: [{ gold: 2 }] },
  330: { need: withBow('20') },
  // a sense of the soldiers is offered only with the right discipline
  332: { need: { 346: { disc: ['pathsmanship', 'divination'] } } },
  334: { need: withBow('209') },
  // light for the pit: a Firesphere, or a Torch and a Tinderbox
  339: { todo: 'to cross the dark pit you need a Firesphere, or a Torch together with a Tinderbox: only then may you turn to the first way.' },
  340: { todo: 'draw three numbers and add them (the engine draws one: draw twice more by hand); with Weaponmastery with Bow add 3. No Arrows are spent. A borrowed bow was chosen at 18: its penalty is for the final.' },
  343: { todo: 'there is no time to evade this fight, whatever the Evade control shows.' },
  344: { todo: 'break off the fight and go to the next section as soon as the Dakomyd is at 25 ENDURANCE or less (use the Turn to section box).' },
  // the key is used up
  293: { take: [{ item: 'smallSilverKey6' }] },
};

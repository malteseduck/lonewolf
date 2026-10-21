/* Book 6's items and the other bookkeeping its text asks of the player, read section by section and
   written down by hand (see items-01fftd.js for the fields, items-02fotw.js for the later ones, and
   docs/reference/items.md for how). Notes on this book:
     - The first Magnakai book: bow shots (bowShot) are marked where the draw is the shot itself, with
       the ranges for the total the engine builds (Weaponmastery with Bow added). Where a shot has no
       draw (a plain hit that only costs an Arrow) the section takes the Arrow instead.
     - Where the text lets the player shoot "if you have a Bow", the choice is gated on any bow (the
       Bow, or the prize bow once won) and an Arrow to shoot with (the rules: a Bow needs an Arrow a
       shot); the way "if you do not have a Bow" opens when he lacks either.
     - The prize Silver Bow is called a Special Item in the text, but the engine reads a bow's bonus
       to a shot only from the weapons carried, so it is entered as a weapon (it takes a weapon place).
     - The archery tournament: the qualifying round (340) is three numbers added, and the bow
       borrowed at 18 is a mark for this adventure (214, 298), ended where the tournament ends. The
       final (26) is a fight in 50 TARGET points a side, the borrowed bow's penalty in its rounds. The
       wager game at 284 (up to three bets) is a game.
     - Bribes, fees and the Amory cess are paid at the choice that pays them (need ... spend). The
       dormitory at 17 can also be paid with goods (a footnote), so it alone is left as a note.
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
  smallSilverKey6: { name: 'Small Silver Key', kind: 'special', glyph: 'key', about: 'Opens the tomb in Tekaro cathedral where the Lorestone lies.' },
  brassWhistle6: { name: 'Brass Whistle', kind: 'special', glyph: 'whistle' },
  silverBow: { name: 'Silver Bow of Duadon', kind: 'weapon', ranged: true, shot: 3, weapon: ['bow'], glyph: 'pocket-bow', about: 'The tournament prize: +3 to the number for every bow shot, on top of Weaponmastery with Bow. Useless hand to hand.' },
  boninWarhammer: { name: 'Bronin Warhammer', kind: 'weapon', weapon: ['warhammer'], cs: 1, glyph: 'warhammer', about: 'A bronze-bright hammer that never tarnishes: +1 COMBAT SKILL when you fight with it.' },
  laumspur3: { name: 'Potion of Laumspur', kind: 'backpack', glyph: 'health-potion', heal: 3, about: 'A smaller dose than usual. Drink it after a fight.' },
  taunorWater6: { name: 'Taunor Water', kind: 'backpack', glyph: 'round-bottom-flask', heal: 6, about: 'Spa water in a glass jar, from Castle Taunor: restores 6 ENDURANCE. Drink it now or keep it.' },
  graveweed6: { name: 'Graveweed Concentrate', kind: 'backpack', glyph: 'round-bottom-flask', about: 'Deadly if swallowed.' },
  alletherBerries6: { name: 'Alether Berries', kind: 'backpack', glyph: 'elderberry', boost: 2, about: 'A handful swallowed before a fight: +2 COMBAT SKILL for that fight, and no more than one handful in any one fight.' },
  wine6: { name: 'Bottle of Wine', kind: 'backpack', glyph: 'wine-bottle' },
  mirror6: { name: 'Mirror', kind: 'backpack', glyph: 'mirror-mirror' },
};

const bows = ['bow', 'silverBow'];
// "if you have a Bow" gating the way to a shot (a Bow and an Arrow), and the way without
const armed = { item: bows, arrows: 1, label: 'a Bow and an Arrow' };
const withBow = (to, other) => ({ [to]: { any: [armed] }, ...(other ? { [other]: { any: [{ not: armed, label: 'no Bow, or no Arrow' }] } } : {}) });
const pay = (gold) => ({ gold, spend: true });
const cess = { item: 'cess6' };
const map = { item: 'mapVaretta' };
const light = [{ item: 'firesphere' }, { items: ['torch', 'tinderbox'] }];
// the number drawn is the loss, 0 counting as 10
const loss = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], ep: -(n || 10) }));
// the number drawn plus a fixed sum is the Crowns won
const win = (add) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ range: [n, n], gold: n + add }));
const taunor = { loot: [{ item: 'taunorWater6' }] };
// the conundrum's wager (245), lost by a wrong answer
const lost = { settle: { conundrum6: -1 } };
// the tournament is over: a borrowed bow goes back
const bowBack = { unmark: ['boneBow6', 'jakan6'] };
const cold = { when: [{ unless: { disc: 'nexus' }, ep: -1 }] };
const meals = (n) => Array.from({ length: n }, () => ({ item: 'meal' }));

// the borrowed bows' penalties, for the tournament's final (26)
export const MARKS = {
  boneBow6: { name: 'Kalte bone bow', about: 'borrowed for the tournament: 4 COMBAT SKILL less in its final.', book: true },
  jakan6: { name: 'Jakan', about: 'borrowed for the tournament: 2 COMBAT SKILL less in its final, and it breaks if a 0 is drawn there.', book: true },
};

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
  // the creature is down: his losses in the first two rounds do not count
  12: { fight: { rounds: [{ upTo: 2, heroLoss: 0, note: 'It lies face down' }] } },
  13: { need: withBow('56') },
  // the map is handed over, however he came by it
  16: { give: [map] },
  17: { need: { 202: pay(3), 251: pay(5) }, todo: 'the dormitory costs 2 Gold Crowns; if you cannot pay, hand over a Backpack Item or a Weapon instead.' },
  20: { take: [{ arrows: 1 }] },
  24: { need: { 101: { item: 'rope' } } },
  // the final: 50 TARGET points a side in place of Endurance (his own untouched), fought with a Bow (his own or
  // the one borrowed at 18), no Shield (footnote), no Psi-surge or Mindblast (ruling R16); a borrowed bow's
  // penalty, and the Jakan breaking on a 0
  26: { rnt: null, fight: { points: { n: 50, lose: '183' }, to: '252', lend: 'bow', noShield: true, noMind: true,
    stop: { drawn: [0], to: '335', if: { mark: 'jakan6' } },
    rounds: [{ csMod: -4, if: { mark: 'boneBow6' }, note: 'Kalte bone bow' }, { csMod: -2, if: { mark: 'jakan6' }, note: 'Jakan' }] } },
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
  50: lost,
  51: { ep: -2 },
  54: { ep: -2 },
  // he is struck down by the bolt; the number drawn is the wound, 0 counting as 10
  56: { take: [{ arrows: 1 }], rolls: loss() },
  62: { settle: { conundrum6: 1 } },
  // the glass jar of spa water
  65: taunor,
  // the mercenary buys only these; the night needs 2 Crowns
  76: { sell: { sword: 3, dagger: 1, broadsword: 6, shortSword: 2, mace: 3, rubyRing6: 10, warhammer: 5, spear: 4, axe: 2, bow: 5, quarterstaff: 2, silverBrooch6: 7 }, need: { 336: { gold: 2 } } },
  78: { fight: { stop: { foeAt: 11, to: '180' } } },
  85: { ep: -2, need: withBow('178', '39') },
  88: { give: [{ gold: 5 }] },
  91: { rolls: win(5) },
  // a win in three rounds or fewer, else his comrades come on (215)
  92: { fight: { won: { within: 3, to: '77', else: '215' } } },
  // an arrow shot: 0-3 miss the creature, 4 or more hit
  95: { bowShot: { 155: [0, 3], 12: [4, 12] } },
  96: { need: { 49: cess, 221: { ...cess, not: true } } },
  // the cheapest ticket is 10 Crowns
  102: { need: { 10: { gold: 10 } } },
  // the weapons shop: prices as chalked up; he buys back at a crown less
  98: { loot: [{ item: 'broadsword', cost: 7 }, { item: 'dagger', cost: 2 }, { item: 'shortSword', cost: 3 }, { item: 'warhammer', cost: 6 }, { item: 'spear', cost: 5 }, { item: 'mace', cost: 4 }, { item: 'axe', cost: 3 }, { item: 'bow', cost: 7 }, { item: 'quarterstaff', cost: 3 }, { item: 'sword', cost: 4 }, { arrows: 2, cost: 1 }],
    sell: { broadsword: 6, dagger: 1, shortSword: 2, warhammer: 5, spear: 4, mace: 3, axe: 2, bow: 6, quarterstaff: 2, sword: 3 },
    todo: 'he also buys Arrows, 4 for 1 Gold Crown (a footnote): do that by hand.' },
  106: taunor,
  109: { loot: [{ item: 'mapTekaro6' }] },
  111: { loot: [{ item: 'potion' }] },
  112: taunor,
  113: lost,
  114: { fight: { rounds: [{ upTo: 1, csMod: 2, note: 'Surprise' }] } },
  123: { loot: [{ item: 'alletherBerries6', cost: 3 }], todo: 'buy at most 3 handfuls.' },
  // a ticket from Soren, of any of the three kinds, takes the first way
  124: { need: { 59: { item: ['ticketLuyen6', 'ticketRhem6', 'ticketEula6'] }, 290: { item: ['ticketLuyen6', 'ticketRhem6', 'ticketEula6'], not: true } } },
  137: { need: { 332: pay(3) } },
  139: { loot: [{ item: 'axe' }, { gold: 11 }, { item: 'dagger' }, { item: 'silverBrooch6' }] },
  // the entrance fee is paid on arrival; he must have a bow of his own to enter (the Arrows are found him)
  141: { take: [{ gold: 2 }], need: { 340: { item: bows }, 18: { item: bows, not: true } } },
  // the dive to the deck: less with Nexus or Divination, less again with a shield
  142: { rntMod: [{ disc: ['nexus', 'divination'], plus: -2 }, { item: 'shield', plus: -3 }], ranges: { 184: [-99, 4], 51: [5, 99] } },
  // a thief took one Backpack Item of his choice in the night
  144: { take: [{ pick: 'backpack', n: 1 }] },
  145: { loot: [{ gold: 12 }, { item: 'rubyRing6' }] },
  153: { ep: -5, need: withBow('178', '39') },
  // the first round bare-handed; evading only after four
  155: { fight: { rounds: [{ upTo: 1, unarmed: true }], evade: { after: 4, to: '305' } } },
  157: { ep: 1, loot: [{ meal: 1 }, { meal: 1 }] },
  // the cellar: Gwynian gives the key, and the rest is for the taking
  158: { give: [{ item: 'smallSilverKey6' }], loot: [{ item: 'quarterstaff' }, { meal: 1 }, { meal: 1 }, { meal: 1 }, { item: 'mace' }, { item: 'brassWhistle6' }, { item: 'rope' }, { item: 'shortSword' }] },
  160: { give: [{ item: 'cess6' }] },
  162: { need: withBow('198', '343') },
  164: { ep: -2 },
  165: { need: { 16: pay(5) } },
  // the jump scatters two things from the pack
  166: { take: [{ pick: 'backpack', n: 2 }] },
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
  201: { fight: { won: { within: 3, to: '15', else: '87' }, barred: ['bow'] } },
  202: { ep: 1 },
  // swords drawn: the hammer is cut from the corpse with a rope, or by will
  207: { loot: [{ item: 'boninWarhammer' }] },
  209: { take: [{ arrows: 1 }] },
  211: { need: { 17: map, 104: { ...map, not: true } } },
  // two Special Items or 20 Gold Crowns, or the prize bow (paid at 45), for the horse
  212: { todo: 'unless you gave the Silver Bow, hand over 2 Special Items or 20 Gold Crowns for the horse.' },
  45: { need: { 212: { item: 'silverBow', spend: true } } },
  214: { mark: 'boneBow6' },
  219: { need: withBow('301', '78') },
  // as many Gold Crowns as he likes into the statue
  220: { stake: { spend: true } },
  222: { ep: -12 },
  223: lost,
  224: { need: withBow('170') },
  227: { need: withBow('20') },
  196: { need: withBow('20') },
  // the room key and the Meal, paid in advance
  232: { take: [{ gold: 3 }], need: { 219: { item: 'meal', spend: true } } },
  74: { need: withBow('20') },
  245: { stake: { key: 'conundrum6' } },
  246: taunor,
  249: { need: { 235: { item: 'mapTekaro6' } } },
  // a hot bath and a good night
  251: { ep: 3 },
  // the room and the horse's keep at 3 Crowns; a Meal is due, or one bought here for a Crown
  253: { need: { 35: pay(3), 54: { any: [{ not: { gold: 3 } }] } }, meal: true, mealCost: 1 },
  254: { fight: { rounds: [{ upTo: 1, csMod: -2, unless: { disc: 'huntmastery' }, note: 'Attacked from behind' }] } },
  // a bow shot at the beast's eyes
  243: { bowShot: { 155: [0, 3], 292: [4, 8], 264: [9, 12] } },
  266: { ep: 1 },
  268: { bowShot: { 155: [0, 5], 236: [6, 8], 75: [9, 12] } },
  // the Sommerswerd's doubling is the engine's own (undead)
  270: { fight: { undead: true, rounds: [{ upTo: 2, csMod: -2, unless: { disc: 'huntmastery' }, note: 'Surprise' }, { heroEach: 2, unless: { disc: 'nexus' }, note: 'The cold' }] } },
  273: { need: { 304: pay(3) } },
  // the map seller
  275: { loot: [{ item: 'mapSommerlund6', cost: 5 }, { item: 'mapTekaro6', cost: 4 }, { item: 'mapLuyen6', cost: 3 }] },
  276: { loot: [{ item: 'boninWarhammer' }] },
  278: { ep: -3, need: withBow('198', '343') },
  282: { ep: -1 },
  // a bet on the rider's feat, up to three rounds, 10 Crowns at most
  284: { game: { kind: 'higher', stake: { min: 1, max: 10 }, win: 2, vs: 3, bets: 3, broke: '76', done: '347', quit: '336' } },
  295: { need: { 321: { item: 'sommerswerd' } } },
  298: { rnt: null, mark: 'jakan6' },
  301: { take: [{ arrows: 1 }] },
  304: { give: [{ item: 'cess6' }] },
  // the cold costs a point unless Nexus spares it
  306: cold,
  171: cold,
  // loaves at 2 Crowns, each one a Meal: the Meal due may be one bought here
  307: { loot: [{ meal: 1, cost: 2 }], mealCost: 2 },
  310: { ep: -2 },
  313: { ep: -8 },
  315: { ep: -4 },
  322: { need: { 332: pay(10) } },
  328: { take: [{ gold: 2 }] },
  330: { need: withBow('20') },
  // a sense of the soldiers is offered only with the right discipline
  // with no gold at all, the gambling (91) is the only way; with some, the rest
  332: { need: { 91: { any: [{ not: { gold: 1 } }] }, 346: { disc: ['pathsmanship', 'divination'], any: [{ gold: 1 }] }, 172: { gold: 1 }, 232: { gold: 1 } } },
  // the prize bow is the proof of the win
  325: { need: { 45: { item: 'silverBow' }, 132: { item: 'silverBow', not: true } } },
  334: { need: withBow('209') },
  // light for the pit: a Firesphere, or a Torch and a Tinderbox
  339: { need: { 80: { any: light }, 90: { any: [{ not: { any: light } }] } } },
  // the qualifying round: three numbers added, 3 more with Weaponmastery with Bow; no Arrow spent
  340: { draws: 3, rntMod: [{ mastery: 'bow', plus: 3 }], ranges: { 103: [0, 7], 26: [8, 99] } },
  // the tournament's ends
  103: bowBack,
  183: bowBack,
  252: { rnt: null, give: [{ item: 'silverBow' }], ...bowBack },
  335: bowBack,
  // evading only after three rounds
  343: { fight: { evade: { after: 3, to: '305' } } },
  344: { fight: { stop: { foeAt: 25, to: '310' } } },
  // the key is used up
  293: { take: [{ item: 'smallSilverKey6' }] },
};

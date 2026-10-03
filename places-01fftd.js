/* Book 1's journey as places on the Lastlands replica, so the figure walks from one to the next as
   the story moves. The book names few of them: these are made up to fit what each passage
   describes (a watchtower, a fallen tree, a lake with a shack), named here in our own words, and
   laid out between the Kai Monastery and Holmgard: a few fixed by hand, the rest placed so the
   routes between them stay short. Positions are in the printed map's pixels.
   [name, symbol, x, y]; the symbol is drawn on the map whether or not he has been there: a
   building (house, tower, keep, temple, obelisk, bridge), or stream, hill, tree, wood, lake, marsh.
   A name says what the spot looks like as he comes to it, never what happens there: it shows in
   the banner as he arrives, before the passage is read. */
export const PLACES = {
  kai: ['Kai Monastery', null, 168, 466], undergrowth: ['The undergrowth', null, 169, 477],
  raumas: ['Ruins of Raumas', 'temple', 191, 468], ambushrun: ['Narrow path', null, 177, 479],
  rockyhill: ['Rocky hill', 'hill', 171, 487], foothill: ['Foot of the slope', null, 166, 494],
  logcabin: ['Old log cabin', 'house', 169, 511], treehouse: ['Great tree', 'tree', 177, 504],
  lostwoods: ['Deep woods', 'wood', 165, 503], tunnel: ['Tunnel in the hill', 'hill', 182, 494],
  twisting: ['Twisting track', null, 157, 466], gallowbrush: ['Thorny thicket', null, 163, 483],
  fogwood: ['Fogwood', 'house', 157, 477], ravenoak: ["Raven's oak", 'tree', 143, 484],
  redstranger: ['Bend in the track', null, 150, 493], streamwash: ['Clear stream', 'stream', 158, 499],
  kraanpath: ['Wide path', null, 151, 482], prints: ['Small clearing', null, 140, 495],
  fallentree: ['Fallen tree', null, 149, 503], watchtower: ['Watchtower', 'tower', 159, 490],
  refugeeclearing: ['Wooded clearing', null, 164, 472], boulderhill: ['Hill of boulders', 'hill', 172, 497],
  druidcave: ['Cave in the hillside', 'hill', 184, 483], skeleton: ['Quiet clearing', null, 158, 509],
  icystream: ['Icy stream', 'stream', 178, 488], soldiers: ['Forest track', null, 190, 491],
  smallbridge: ['Small bridge', 'bridge', 178, 471], benchclearing: ['Carved bench', null, 185, 462],
  swordclearing: ['Stone plinth', null, 186, 473], burntcabin: ['Burnt cabin', 'house', 195, 462],
  mossyhut: ['Mossy hut', 'house', 177, 462], woundedsoldier: ['Edge of the wood', null, 194, 475],
  stonebridge: ['Stone bridge', 'bridge', 202, 477], refugeeroad: ['The south road', null, 201, 470],
  farmhouse: ['Farmhouse', 'house', 193, 481], caravan: ['On the highway', null, 205, 489],
  sparsewood: ['Sparse hills', 'hill', 197, 496], alema: ['Bridge of Alema', 'bridge', 204, 484],
  signpost: ['Signpost', null, 192, 509], meadow: ['Meadow', null, 188, 502],
  roadambush: ['Path to the Durncrag', null, 201, 517], deepforest: ['Deep forest', 'wood', 184, 512],
  lakeshack: ['Lake and shack', 'lake', 190, 520], marsh: ['Marsh', 'marsh', 212, 499],
  ridgeway: ['Footbridge', 'bridge', 212, 477], cabinstable: ['Cabin and stable', 'house', 212, 487],
  vordakglade: ['Glade', null, 199, 514], highwaysign: ['Highway signpost', null, 208, 496],
  overlook: ['Ridge above Holmgard', 'hill', 205, 502], cottages: ['Cottages', 'house', 213, 508],
  banditbridge: ['Footbridge on the highway', 'bridge', 216, 512], riverbank: ['River bank', null, 204, 519],
  barge: ['Riverside wreck', null, 211, 519], 
  fieldworks: ['Fieldworks', 'keep', 217, 516],
  // Holmgard, on its town plan (towns-01fftd.js): these are in the plan's own 1000x700 grid
  hcgate: ['Main gate', null, 430, 630], hcwatch: ['Main watchtower', 'tower', 474, 622], hcstreet: ['Main street', null, 404, 544],
  hcalley: ['Dark alleyway', null, 344, 556], hcshop: ['Green door', 'house', 298, 582], hcroofs: ['Rooftops', null, 330, 500],
  hccitgate: ['Citadel gate', null, 362, 462], hceast: ['East side of the citadel', null, 446, 352], hcguild: ['Guildhall', 'temple', 528, 444],
  hccourt: ['Citadel courtyard', null, 334, 414], hcpalace: ['The palace', null, 330, 330],
  // the Graveyard of the Ancients and the tombs beneath it, on its own plan
  gyedge: ['Edge of the necropolis', null, 100, 96], gyweed: ['Between two pillars', null, 247, 134], gytomb: ['Underground tomb', null, 212, 252],
  gyjunction: ['Crossing of corridors', null, 470, 228], gynorth: ['Corridor turning east', null, 540, 176], gyskulls: ['Hall of skulls', null, 648, 206],
  gythrone: ['Chamber of the throne', null, 600, 446], gyslope: ['Sloping passage', null, 806, 512], gydoor: ['Hall of the great door', null, 840, 386],
};

/* places named on the book's printed map: the map always shows their names. Any other place it
   names only once he has been there, so a road offered on it says no more than the choice in the
   book does. */
/* Book 1 travels on one view of the Lastlands, and on two plans of its own (towns-01fftd.js) for
   the city and the Graveyard; a plan's mark stands at its spot on the Lastlands */
export const LEGS = {
  country: { name: 'The Lastlands', view: [125, 446, 110, 77], places: ['kai', 'ravenoak', 'undergrowth', 'raumas', 'ambushrun', 'rockyhill', 'foothill', 'logcabin', 'treehouse', 'lostwoods', 'tunnel', 'twisting', 'gallowbrush', 'fogwood', 'redstranger', 'streamwash', 'kraanpath', 'prints', 'fallentree', 'watchtower', 'refugeeclearing', 'boulderhill', 'druidcave', 'skeleton', 'icystream', 'soldiers', 'smallbridge', 'benchclearing', 'swordclearing', 'burntcabin', 'mossyhut', 'woundedsoldier', 'stonebridge', 'refugeeroad', 'farmhouse', 'caravan', 'sparsewood', 'alema', 'signpost', 'meadow', 'roadambush', 'deepforest', 'lakeshack', 'marsh', 'ridgeway', 'cabinstable', 'vordakglade', 'highwaysign', 'overlook', 'cottages', 'banditbridge', 'riverbank', 'barge', 'fieldworks'] },
  holmgard: { name: 'Holmgard', city: 'holmgard', at: [222, 520], view: [0, 0, 1000, 700], places: ['hcgate', 'hcwatch', 'hcstreet', 'hcalley', 'hcshop', 'hcroofs', 'hccitgate', 'hceast', 'hcguild', 'hccourt', 'hcpalace'] },
  graveyard: { name: 'Graveyard of the Ancients', city: 'graveyard', at: [200, 506], mark: 'obelisk', view: [0, 0, 1000, 700], places: ['gyedge', 'gyweed', 'gytomb', 'gyjunction', 'gynorth', 'gyskulls', 'gythrone', 'gyslope', 'gydoor'] },
};

export const KNOWN = ['kai', 'raumas', 'fogwood', 'alema', 'fieldworks', 'hcgate', 'hccitgate', 'gyedge'];

/* which sections happen at each place (section numbers only) */
export const AT = {
  kai: [1], undergrowth: [141, 56, 222, 67],
  raumas: [333, 131, 241, 55, 302, 110, 285, 325, 349, 293, 101],
  ambushrun: [281, 295, 185, 92],
  rockyhill: [311, 324, 279, 112, 96, 33, 47, 322, 17, 136, 313, 89, 53, 274, 316, 280, 327],
  foothill: [248, 44, 226, 277, 338, 113], logcabin: [347, 103, 287, 330, 315], treehouse: [13, 307, 300],
  lostwoods: [213, 343, 276, 2], tunnel: [331, 170, 319],
  twisting: [275, 345, 74, 138, 291], gallowbrush: [19, 69, 119, 77],
  fogwood: [272, 134, 305, 40], ravenoak: [105, 298, 335], redstranger: [121, 342, 283, 309, 123, 304],
  streamwash: [38, 128, 297, 336, 117],
  kraanpath: [85, 229, 99, 267], prints: [125, 301, 214],
  fallentree: [27, 52, 225, 187, 250, 39, 228, 186], watchtower: [140, 36, 323, 290], refugeeclearing: [252, 155],
  boulderhill: [14, 43, 195], druidcave: [59, 124, 211, 173, 158, 244, 93, 259], skeleton: [215, 346],
  icystream: [106, 263], soldiers: [334, 48, 73, 162, 258, 127, 50, 243], smallbridge: [70, 8],
  benchclearing: [28, 130, 68, 201], swordclearing: [15, 35], burntcabin: [238, 42, 86], mossyhut: [147],
  woundedsoldier: [167, 178, 88, 216, 31, 264], stonebridge: [207],
  refugeeroad: [157, 30, 194, 261, 208, 81, 6, 183, 320, 200], farmhouse: [148, 199],
  caravan: [168, 78, 12, 132, 247, 159, 220, 191, 262, 24, 234, 184, 64, 188, 16, 192, 120, 84, 171, 54],
  sparsewood: [303, 237, 72],
  alema: [97, 255, 82, 306], signpost: [235, 254], meadow: [32, 176, 193, 340, 253, 278], roadambush: [146, 154],
  deepforest: [126], lakeshack: [46, 296, 246, 197, 90, 172, 18, 114, 29, 270, 239],
  marsh: [21, 189, 312, 299, 227, 271, 348, 95], ridgeway: [240, 79, 204],
  cabinstable: [111, 57, 109, 164, 308, 122, 233, 5], vordakglade: [34, 328, 76, 118],
  highwaysign: [206, 143, 149, 256], overlook: [224, 153, 142, 265, 202, 58],
  cottages: [251, 10, 115, 150, 177, 160, 286], banditbridge: [83, 45, 205, 180, 232, 22, 181, 62, 145],
  riverbank: [135, 4, 223, 75, 175, 218, 41, 182, 116, 260, 156, 294, 245, 163, 174],
  barge: [190, 20, 321, 273, 230, 179, 51, 221],
  fieldworks: [61, 268, 288, 318],
  hcgate: [129],
  hcwatch: [3, 196],
  hcstreet: [63, 144, 269],
  hcalley: [217],
  hcshop: [49, 60, 80, 91, 94, 152, 198, 203, 231, 339, 344],
  hcroofs: [7, 25, 108],
  hccitgate: [98, 314],
  hceast: [37, 282, 289],
  hcguild: [210, 310, 341],
  hccourt: [11, 66, 139],
  hcpalace: [165, 212, 332, 350],
  gyedge: [102, 329],
  gyweed: [284],
  gytomb: [9, 65, 71, 166, 236, 242, 292],
  gyjunction: [104],
  gynorth: [26],
  gyskulls: [107, 137, 169, 249],
  gythrone: [100, 133, 161, 257, 266],
  gyslope: [209],
  gydoor: [23, 87, 151, 219, 317, 326, 337],
};

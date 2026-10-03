/* Book 2's journey as places on the Lastlands replica. As for Book 1 (places-01fftd.js), the book
   names few of them: the rest are made up to fit what each passage describes, named in our own
   words, never by what happens there. Positions are in the printed map's pixels, all set by hand.
   [name, symbol, x, y]; symbols as in places-01fftd.js.
   The journey crosses most of the map, so it is shown in legs (LEGS): each a close view of its own,
   like Book 1's one view. A choice that leads into another leg stays on the page, and the map
   turns to the new leg when he arrives. A leg may instead be a town plan (city: a key of CITIES in
   city.js), its places in the plan's own grid and at: its spot on the printed map. */
export const PLACES = {
  // Holmgard's harbour, on the town plan (city.js): these are in the plan's own 1000x700 grid
  quaysquare: ['Square by the quay', null, 514, 460], inn: ['Good Cheer Inn', 'house', 484, 502],
  backstairs: ['Stairs behind the inn', null, 398, 530], quay: ['The quay', null, 630, 424],
  ship: ['The Green Sceptre', 'ship', 640, 300],
  // the voyage east
  holmgulf: ['The Holmgulf', null, 320, 477],
  wreckpoint: ['Wreck Point', null, 405, 492], opensea: ['Open sea', null, 432, 500],
  roughsea: ['Rough water', null, 490, 526], adrift: ['Within sight of land', null, 468, 536],
  // the Wildlands coast, Ragadorn, and the coach road to Gorn Cove
  beach: ['Dunes by the shore', 'tree', 460, 553], roadtree: ['Tree by the coast road', 'tree', 446, 543],
  coastroad: ['The coast road', null, 474, 559], ragwest: ['West Ragadorn', null, 490, 578],
  ragwharf: ['Ragadorn waterfront', null, 514, 577], ragstables: ['Coach station', 'house', 524, 580],
  ragroad: ['Road out of the city', null, 537, 582], kalanane: ['Shrine of Kalanane', 'temple', 553, 587],
  tollbridge: ['Wooden bridge', 'bridge', 573, 585], coachinn: ['Inn on the coast road', 'house', 600, 586],
  cliffroad: ['Road under the cliffs', 'hill', 634, 588], gorncove: ['Gorn Cove', null, 664, 616],
  gornstreet: ['Village street', null, 672, 600],
  // the border forest, the Rymerift and Port Bax
  fens: ['Moors and fens', 'marsh', 676, 622], ridge: ['Grassy ridge', 'hill', 672, 633],
  clearing: ['Small clearing', null, 683, 628], bordertower: ['Wooden tower', 'tower', 688, 612],
  stuntedoak: ['Fork by a stunted oak', 'tree', 686, 600], forestcabin: ['Dusty cabin', 'house', 676, 598],
  stonebridge: ['Stone bridge', 'bridge', 694, 588], knighttower: ['Tall watchtower', 'tower', 692, 641],
  hutbridge: ['Bridge with a hut', 'bridge', 710, 619], portbax: ['Port Bax', null, 713, 585],
  // up the Durenon to the Tarnalin and Hammerdal
  waterfall: ['Camp by a waterfall', 'stream', 806, 497], hillside: ['Wooded hillside', 'wood', 818, 514],
  tunnelmouth: ['Mouth of the Tarnalin', 'hill', 838, 526],
  cavern: ['Torchlit cavern', null, 866, 502], tunnelfork: ['Fork in the tunnel', null, 861, 516],
  lefttunnel: ['Left tunnel', null, 873, 505], righttunnel: ['Right tunnel', null, 876, 526],
  barricade: ['Wagons across the road', null, 895, 500], hammerdal: ['Hammerdal', null, 918, 487],
  // home with the fleet
  fleet: ['With the fleet', null, 560, 485], fogbank: ['Fog off the isles', null, 430, 470],
  homebound: ['The Holmgulf', null, 320, 477], homecoming: ['Holmgard', null, 222, 520],
};

export const LEGS = {
  harbour: { name: 'Holmgard', city: 'holmgard', at: [222, 520], view: [0, 0, 1000, 700], places: ['quaysquare', 'inn', 'backstairs', 'quay', 'ship'] },
  sea: { name: 'The voyage', view: [170, 380, 500, 350], places: ['holmgulf', 'wreckpoint', 'opensea', 'roughsea', 'adrift'] },
  wildlands: { name: 'The Wildlands', view: [420, 495, 270, 189], places: ['beach', 'roadtree', 'coastroad', 'ragwest', 'ragwharf', 'ragstables', 'ragroad', 'kalanane', 'tollbridge', 'coachinn', 'cliffroad', 'gorncove', 'gornstreet'] },
  border: { name: 'The border of Durenor', view: [620, 545, 150, 105], places: ['fens', 'ridge', 'clearing', 'bordertower', 'stuntedoak', 'forestcabin', 'stonebridge', 'knighttower', 'hutbridge', 'portbax'] },
  durenor: { name: 'Durenor', view: [785, 450, 150, 105], places: ['waterfall', 'hillside', 'tunnelmouth', 'cavern', 'tunnelfork', 'lefttunnel', 'righttunnel', 'barricade', 'hammerdal'] },
  home: { name: 'The voyage home', view: [170, 330, 600, 420], places: ['fleet', 'fogbank', 'homebound', 'homecoming'] },
};

export const KNOWN = ['quaysquare', 'inn', 'quay', 'ship', 'holmgulf', 'wreckpoint', 'ragwest', 'ragwharf', 'gorncove', 'portbax', 'tunnelmouth', 'hammerdal', 'homebound', 'homecoming'];

export const AT = {
  quaysquare: [1],
  inn: [16, 48, 133, 160, 203, 255, 268, 273, 348],
  backstairs: [333],
  quay: [67, 125],
  ship: [300],
  holmgulf: [22, 74, 81, 94, 99, 107, 119, 163, 184, 260, 281, 294, 316, 326, 341],
  wreckpoint: [34, 146, 224, 243, 345],
  opensea: [12, 29, 53, 58, 101, 154, 167, 175, 190, 209, 222, 236, 240, 287, 308, 315, 321, 329],
  roughsea: [78, 141, 197, 247],
  adrift: [41, 180, 251, 278],
  beach: [139, 171, 228, 337],
  roadtree: [8, 27, 44, 63, 70, 89, 114, 117, 188, 201, 206, 212, 219, 233, 264, 285, 312],
  coastroad: [292],
  ragwest: [20, 37, 46, 61, 93, 96, 112, 121, 122, 131, 137, 148, 161, 181, 214, 230, 257, 259, 298, 301, 323, 335],
  ragwharf: [4, 6, 14, 18, 24, 56, 65, 72, 83, 86, 91, 104, 110, 127, 129, 143, 151, 157, 165, 173, 177, 182, 192, 194, 199, 215, 217, 226, 227, 231, 245, 253, 262, 266, 271, 276, 283, 289, 297, 303, 305, 310, 319, 331, 342],
  ragstables: [10, 32, 136, 169, 186, 238],
  ragroad: [339],
  kalanane: [51, 103],
  tollbridge: [50, 195],
  coachinn: [39, 156, 205, 213, 249, 280, 346],
  cliffroad: [2, 42, 108, 343],
  gorncove: [7, 21, 25, 33, 36, 60, 76, 85, 116, 124, 130, 145, 153, 158, 168, 178, 200, 210, 220, 221, 241, 270, 275, 290, 296, 314, 330],
  gornstreet: [3, 11, 19, 54, 55, 71, 82, 88, 90, 132, 179, 235, 274, 317, 347],
  fens: [150],
  ridge: [198, 261],
  clearing: [28, 77, 95, 106, 239, 320],
  bordertower: [68, 138, 149, 232, 250, 306],
  stuntedoak: [13, 35],
  forestcabin: [293],
  stonebridge: [155, 223],
  knighttower: [15, 80, 98, 115, 135, 162, 174, 189, 288, 291, 302, 324, 334],
  hutbridge: [47, 57, 111, 140, 147, 187, 207, 244, 282, 307],
  portbax: [31, 62, 75, 84, 126, 142, 152, 170, 191, 202, 211, 246, 252, 263, 265, 318, 327],
  waterfall: [45, 59, 69, 92, 176, 254, 277, 322, 332, 344],
  hillside: [159, 183, 311],
  tunnelmouth: [118, 279, 299],
  cavern: [23, 144, 295],
  tunnelfork: [102, 325, 340],
  lefttunnel: [38, 64, 134, 208, 229, 269, 304, 313],
  righttunnel: [52, 164, 172, 234, 256, 338],
  barricade: [87, 284, 349],
  hammerdal: [9, 40, 79, 97, 123, 196, 242],
  fleet: [49, 193, 216],
  fogbank: [5, 17, 26, 30, 43, 66, 73, 100, 105, 109, 113, 120, 128, 166, 185, 204, 218, 237, 248, 258, 267, 272, 286, 309, 328, 336],
  homebound: [225],
  homecoming: [350],
};

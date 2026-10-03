/* Book 2's town plans (city.js paints them), each a leg of its own in places-02fotw.js. Laid out by
   hand on a 1000x700 grid, north up, from the book's text and the references in docs/plan.md (next
   step 1): only their layout is taken, never their art or their names. Every name and spot on a plan
   comes from the book; what the book does not say is made up to fit it, and marked so here. */
export const TOWNS = {
  /* Holmgard's harbour, after the King's Reach of the Sommerlund City Maps (layout only): the reach
     opening east into the Holmgulf between two moles, a river from the north and one from the
     south-west running into it, the citadel by the water on the west, the quays along the south
     shore with the square by the quay and the Good Cheer Inn across it. Book 2, sections 1-333. */
  holmgard: {
    water: [[[395, 335], [470, 300], [560, 288], [650, 276], [740, 262], [820, 248], [872, 232], [902, 188], [930, 100], [950, -30], [1030, -30], [1030, 730],
      [962, 730], [940, 620], [908, 522], [884, 478], [800, 472], [720, 490], [640, 506], [560, 514], [480, 507], [425, 474], [395, 410]]],
    rivers: [{ w: 26, pts: [[510, -30], [515, 80], [530, 170], [548, 240], [562, 292]] }, { w: 30, pts: [[230, 730], [272, 640], [322, 580], [372, 530], [418, 482]] }],
    town: [[[-30, -30], [1030, -30], [1030, 730], [-30, 730]]],
    fields: false,
    walls: [{ pts: [[250, 292], [392, 286], [412, 360], [396, 438], [300, 452], [238, 380]], closed: true, tower: 20 }],
    gates: [[398, 446, 26]],
    citadel: { x: 318, y: 392, h: 110 },
    clear: [[318, 360, 66]],
    quays: [[[472, 505], [560, 514], [640, 507], [720, 490], [800, 472], [868, 472]], [[420, 322], [480, 298], [540, 290]]],
    moles: [[[880, 228], [895, 262], [903, 300]], [[888, 478], [898, 440], [905, 395]]],
    bridges: [[538, 205, 14], [300, 606, 14], [362, 540, 14], [432, 480, 12]],
    streets: [
      [[398, 452], [432, 486], [470, 528], [520, 560], [560, 578]], // the citadel gate to the square: the wagon's way
      [[480, 528], [560, 534], [640, 527], [720, 510], [800, 494], [870, 494]], // along the quay
      [[250, 215], [400, 207], [538, 202], [700, 196], [862, 188]], // the bridge road on the north bank
      [[600, 594], [700, 588], [820, 572], [905, 566]],
      [[580, 268], [700, 252], [840, 236]],
      [[238, 372], [140, 352], [40, 340]],
      [[360, 290], [380, 246], [400, 207]],
      [[560, 598], [574, 650], [588, 720]],
      [[640, 527], [652, 610], [662, 720]],
      [[720, 510], [745, 600], [770, 700]],
      [[470, 528], [440, 600], [410, 700]],
      [[400, 207], [380, 120], [350, 30]], [[700, 196], [690, 110], [700, 30]], [[620, 199], [620, 120], [600, 40]],
      [[250, 215], [170, 260], [100, 300]], [[290, 450], [230, 520], [180, 600]],
    ],
    squares: [[560, 580, 32], [690, 132, 22]],
    symbols: [['fountain', 586, 574, 13], ['fountain', 670, 136, 11]],
    landmarks: [['temple', 640, 112, 32], ['tower', 448, 90, 30], ['keep', 812, 640, 30], ['tower', 160, 430, 26]],
    boats: [[620, 330], [700, 302], [760, 420], [560, 470], [500, 458], [846, 300], [660, 440]],
    labels: [['Holmgard', 140, 80, 34, 0], ['The Holmgulf', 975, 380, 18, -Math.PI / 2, 'sea']],
    compass: [90, 620],
  },

  /* Ragadorn, after the fan map of it drawn from the book (layout only): the sea to the north, the
     River Dorn running north into it between the city's two walled halves, the iron bridge the only
     way across. West: the west gate, Westgate Lane along the wall to Beggar Lane, Black Knight
     Street, Anchor Street down to the wharves, Axe Lane, Sage Street winding to the bridge, West Bank
     Walk and Lookout Street. East: the jetty and Stonepost Square, Booty Walk up to the harbour wall
     and Tomb Street along it to Tomb Square and the watchtower, Barnacle Street with the tavern,
     Cooper Way and Unicorn Street, Eastbank Wharf, the trading post and Oxyoke Way, East Trade Lane
     to the stables and the east gate. Distances are made up. Book 2, sections 4-342. */
  ragadorn: {
    water: [[[-30, -30], [1030, -30], [1030, 118], [900, 128], [800, 136], [700, 132], [600, 136], [530, 122], [470, 118], [400, 108], [300, 98], [200, 94], [100, 102], [-30, 98]]],
    rivers: [{ w: 40, pts: [[520, 730], [510, 620], [495, 520], [490, 450], [500, 380], [495, 300], [505, 220], [510, 150], [506, 100]] }],
    walls: [
      { pts: [[468, 136], [320, 128], [160, 135], [70, 180], [45, 300], [50, 420], [70, 540], [120, 620], [250, 650], [380, 650], [470, 640]] },
      { pts: [[540, 138], [700, 150], [860, 150], [930, 190], [950, 320], [946, 470], [930, 580], [860, 640], [700, 650], [545, 640]] },
    ],
    town: [[[468, 142], [160, 141], [72, 186], [52, 300], [57, 420], [77, 535], [127, 612], [250, 642], [468, 632]],
      [[535, 146], [700, 157], [855, 157], [924, 196], [942, 320], [938, 470], [924, 575], [858, 632], [700, 642], [545, 632]]],
    gates: [[45, 362], [948, 474]],
    quays: [[[527, 170], [523, 250], [517, 330], [512, 420]], [[478, 205], [474, 300], [470, 400]]],
    bridges: [[493, 456, 16]],
    streets: [
      [[75, 365], [150, 370], [255, 380]], // Axe Lane
      [[255, 380], [320, 400], [370, 430], [420, 442], [472, 452]], // Sage Street
      [[515, 458], [600, 465], [700, 470], [800, 470], [880, 472], [945, 474]], // East Trade Lane
      [[610, 305], [700, 308], [790, 310]], // Barnacle Street
      [[75, 360], [80, 280], [100, 205], [160, 172], [240, 180], [300, 190]], // Westgate Lane into Beggar Lane
      [[300, 190], [380, 200], [440, 215], [472, 225]], // Anchor Street
      [[300, 190], [290, 260], [270, 330], [255, 380]], // Black Knight Street
      [[75, 370], [85, 460], [110, 540], [160, 580], [260, 575], [360, 560], [472, 545]], // West Bank Walk into Lookout Street
      [[540, 178], [610, 180], [680, 185]], // Tomb Street
      [[680, 185], [780, 188], [870, 195]], // Watchtower Street
      [[545, 180], [548, 240], [570, 295]], // Booty Walk
      [[790, 310], [795, 250], [800, 190]], // Cooper Way
      [[790, 310], [800, 380], [810, 430], [815, 520]], // Unicorn Street
      [[575, 330], [565, 380], [562, 405], [640, 410], [720, 415], [808, 420]], // Eastbank Wharf into Oxyoke Way
      [[862, 476], [862, 540]], // the narrow street to the gaming-house
      [[160, 300], [270, 300]], [[180, 470], [250, 440], [330, 470]], [[640, 470], [650, 560], [640, 620]], [[740, 470], [760, 560]],
    ],
    main: 4,
    squares: [[590, 305, 26], [680, 190, 20]],
    symbols: [['monument', 590, 300, 20], ['tomb', 694, 206, 15]], // the stone signpost; Killean's tomb
    landmarks: [['temple', 380, 300, 30], ['keep', 700, 590, 30]],
    boats: [[515, 262], [512, 352], [482, 330], [620, 80], [760, 74], [400, 64]],
    labels: [['Ragadorn', 250, 60, 34, 0], ['River Dorn', 512, 612, 13, -1.5, 'soft']],
    compass: [930, 60],
  },

  /* Port Bax, its bones after "Port Brax" of the Low Fantasy Gaming RPG (a stand-in: no map of Port
     Bax exists), fitted to the book: the harbour to the north between two moles, the green city wall
     with an unguarded gate on the west and the moss-covered gate east towards the forest, the
     tree-lined avenue with the city hall, the port watchtower at its end, the cobbled street to the
     Red Gate in the high wall of the naval quadrant, Alin Square and the consulate by the quay, and
     the castle on its hill. Book 2, sections 31-327 and 152. */
  portbax: {
    water: [[[-30, -30], [1030, -30], [1030, 150], [900, 160], [868, 176], [840, 215], [760, 240], [660, 246], [560, 236], [492, 206], [462, 176], [400, 160], [250, 150], [100, 155], [-30, 150]]],
    walls: [
      { pts: [[60, 158], [40, 280], [45, 420], [70, 560], [160, 640], [330, 665], [520, 670], [700, 650], [860, 590], [950, 470], [965, 320], [950, 170]] },
      { pts: [[450, 172], [455, 260], [450, 330], [560, 368], [700, 376], [820, 348], [880, 250], [885, 172]], tower: 18 },
    ],
    town: [[[60, 165], [48, 280], [52, 420], [76, 555], [165, 632], [330, 656], [520, 660], [700, 640], [855, 582], [942, 468], [955, 320], [945, 175]]],
    gates: [[44, 430], [958, 402], [452, 300, 24]],
    citadel: { x: 760, y: 548, h: 90, hill: true },
    clear: [[760, 520, 74]],
    quays: [[[492, 212], [560, 242], [660, 252], [760, 246], [840, 220]]],
    moles: [[[466, 170], [500, 128], [560, 96]], [[866, 170], [820, 120], [760, 92]]],
    streets: [
      [[200, 600], [205, 470], [210, 380], [215, 300]], // the tree-lined avenue
      [[215, 300], [330, 300], [452, 300]], // the cobbled street to the Red Gate
      [[452, 300], [540, 300], [612, 300]], // in through the gate to Alin Square
      [[205, 470], [330, 482], [500, 472], [650, 452], [800, 422], [958, 402]], // across the town to the east gate
      [[50, 430], [130, 432], [205, 440]], // in from the west gate
      [[480, 262], [600, 268], [700, 270], [800, 250], [860, 205]], // along the quay
      [[330, 300], [340, 420], [350, 600]], [[500, 472], [520, 600]], [[650, 452], [630, 600]], [[205, 520], [110, 560]], [[215, 300], [140, 250], [80, 200]], [[330, 300], [360, 220], [420, 190]],
    ],
    main: 4,
    squares: [[640, 302, 28]],
    symbols: [['fountain', 654, 300, 14]],
    trees: [[190, 330, 0.6], [190, 380, 0.6], [192, 430, 0.6], [188, 500, 0.6], [186, 560, 0.6], [230, 340, 0.6], [232, 400, 0.6], [226, 520, 0.6], [224, 580, 0.6]],
    boats: [[560, 200], [740, 210], [800, 190], [600, 160], [700, 140], [500, 100], [300, 110], [880, 120]],
    labels: [['Port Bax', 250, 80, 34, 0]],
    compass: [110, 640],
  },

  /* Gorn Cove, a poor village of hovels round a cove, made up from the book: the Forlorn Hope on the
     village street, the yard behind it with the wheelwright's shop and its hay-cart, a shop with a
     grindstone and the alley behind it, and the stable where the street ends. Book 2, sections 3-347. */
  gorncove: {
    water: [[[-30, -30], [1030, -30], [1030, 140], [900, 150], [820, 172], [782, 232], [742, 298], [680, 336], [600, 330], [540, 290], [500, 212], [440, 152], [300, 132], [150, 140], [-30, 130]]],
    town: [[[180, 300], [400, 262], [520, 330], [640, 384], [780, 334], [870, 384], [870, 560], [700, 600], [500, 592], [300, 582], [180, 522]]],
    houses: { gap: [24, 20], skip: 0.42, size: 1.1, jitter: [14, 11] },
    quays: [[[596, 330], [640, 336], [690, 330]]],
    streets: [
      [[-30, 472], [180, 462], [400, 452], [600, 456], [820, 450]], // the village street
      [[820, 450], [1030, 430]],
      [[620, 456], [636, 400], [646, 340]], // down to the cove
      [[430, 384], [520, 372], [600, 382]], // the yard behind the tavern
      [[300, 472], [292, 524]], // the alley behind the shop
      [[250, 462], [240, 380], [230, 300]], [[700, 453], [720, 540]],
    ],
    main: 2,
    boats: [[660, 282], [600, 258], [730, 250], [520, 230]],
    woods: [[110, 560, 60], [930, 520, 50], [930, 280, 40]],
    labels: [['Gorn Cove', 290, 110, 34, 0]],
    compass: [920, 620],
  },
};

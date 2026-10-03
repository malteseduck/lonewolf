/* Book 1's town plans (city.js paints them), each a leg of its own in places-01fftd.js. Laid out by
   hand on a 1000x700 grid, north up, from the book's text and the references in docs/plan.md (next
   step 1): only their layout is taken, never their art or their names. */
export const TOWNS = {
  /* Holmgard, the whole city, after the Sommerlund City Maps' Holmgard (layout only): the Holmgulf
     to the east, its reach running in to the heart of the city, a river from the north and the
     Eledil from the south-west joining it there, the citadel walled within the walls west of the
     reach, the Guild Bridge over the Eledil by the Guildhall, the main gate in the south wall and
     the main street up to the citadel. The streets beyond those are made up. Book 1, sections
     3-350. */
  holmgard: {
    water: [[[690, -30], [1030, -30], [1030, 730], [960, 730], [925, 620], [905, 500], [890, 380], [880, 300], [862, 250], [790, 290], [720, 330], [650, 365], [580, 400],
      [520, 425], [482, 418], [474, 386], [498, 350], [540, 320], [600, 290], [670, 260], [740, 230], [800, 205], [845, 190], [800, 150], [760, 90], [720, 30]]],
    rivers: [{ w: 26, pts: [[430, -30], [440, 60], [455, 150], [470, 240], [490, 340]] }, { w: 28, pts: [[60, 730], [150, 622], [250, 560], [340, 502], [420, 452], [478, 410]] }],
    walls: [
      { pts: [[765, 96], [700, 90], [560, 75], [436, 72], [300, 85], [180, 110], [110, 190], [90, 300], [105, 430], [150, 540], [230, 620], [360, 655], [500, 665], [640, 650], [760, 610], [860, 560], [906, 498]] },
      { pts: [[906, 494], [890, 380], [880, 300], [866, 256]], towers: false }, { pts: [[845, 188], [800, 150], [765, 98]], towers: false },
      { pts: [[268, 312], [400, 300], [426, 360], [406, 426], [300, 442], [258, 380]], closed: true, tower: 20 }, // the citadel's own wall
    ],
    town: [[[765, 102], [700, 96], [560, 81], [436, 78], [300, 91], [185, 116], [117, 193], [97, 300], [112, 428], [156, 535], [232, 612], [360, 648], [500, 658],
      [640, 643], [756, 604], [855, 554], [898, 495], [884, 380], [874, 300], [860, 250], [840, 190], [795, 152]]],
    gates: [[430, 661, 32], [97, 300], [300, 86], [355, 438, 26], [424, 362, 24]],
    citadel: { x: 340, y: 386, h: 112 },
    clear: [[340, 360, 62]],
    moles: [[[868, 262], [884, 240]], [[842, 186], [862, 202]]],
    bridges: [[446, 432, 14], [462, 190, 14], [250, 560, 14], [470, 300, 12]],
    streets: [
      [[430, 655], [420, 590], [400, 530], [375, 470], [358, 444]], // the main street, from the main gate to the citadel
      [[424, 366], [446, 432], [475, 480], [520, 520]], // over the Guild Bridge
      [[475, 482], [600, 482], [750, 456], [884, 426]],
      [[300, 470], [250, 420], [236, 340], [290, 290], [410, 282], [444, 330]], // round the citadel
      [[400, 540], [362, 554], [322, 566]], // the dark alleyway
      [[520, 520], [640, 560], [760, 600]], [[600, 482], [640, 420]], [[420, 590], [520, 620], [620, 610]],
      [[470, 110], [600, 104], [730, 112]], [[462, 190], [600, 214], [740, 190]], [[600, 104], [620, 214]],
      [[100, 300], [236, 340]], [[150, 450], [250, 420]], [[200, 190], [290, 290]], [[300, 90], [320, 200], [290, 290]],
      [[150, 540], [200, 500], [300, 470]], [[250, 560], [300, 610], [360, 650]],
    ],
    main: 3,
    squares: [[422, 596, 22], [640, 562, 24], [600, 160, 20]],
    symbols: [['fountain', 438, 608, 12], ['fountain', 652, 548, 12], ['fountain', 582, 166, 11]],
    landmarks: [['temple', 700, 150, 30], ['tower', 200, 252, 28], ['keep', 720, 540, 30], ['tower', 560, 598, 26]],
    boats: [[600, 330], [700, 290], [780, 250], [940, 120], [960, 300], [950, 520]],
    labels: [['Holmgard', 160, 50, 34, 0], ['The Holmgulf', 920, 60, 20, 0, 'sea']],
    compass: [960, 640],
  },

  /* The Graveyard of the Ancients and the tombs beneath it, made up from the book, with Jog Brogzin's
     map of it as a check on the order of its rooms (layout only): the necropolis above, the tomb its
     ground gives way into, the tunnel east to a crossing corridor, the stairs north to the hall of
     skulls, the chamber of the serpent and the throne to the south, the sloping passage, and the
     hall of the great door; the south gate in the open ground beyond. Book 1, sections 9-337. */
  graveyard: {
    kind: 'crypt', seed: 77,
    ground: [[[30, 30], [430, 30], [440, 92], [360, 146], [250, 158], [120, 146], [30, 122]], [[700, 566], [984, 526], [984, 686], [640, 686], [618, 624]]],
    rooms: [
      [[180, 172], [310, 172], [310, 286], [180, 286]], // the tomb
      [[620, 140], [820, 140], [820, 270], [620, 270]], // the hall of skulls
      [[560, 380], [720, 380], [720, 500], [560, 500]], // the serpent's chamber
      [[780, 300], [950, 300], [950, 470], [780, 470]], // the hall of the great door
    ],
    passages: [
      { w: 24, pts: [[310, 228], [470, 228]] },
      { w: 22, pts: [[470, 228], [470, 176], [620, 176]] },
      { w: 22, pts: [[470, 228], [470, 440], [560, 440]] },
      { w: 22, pts: [[820, 206], [872, 206], [872, 300]] },
      { w: 20, pts: [[720, 446], [760, 446], [760, 512], [862, 512], [862, 470]] },
    ],
    features: [
      ['hole', 232, 204], ['sarcophagus', 250, 252, 0], ['pillar', 230, 124], ['pillar', 264, 124],
      ['stairs', 600, 176, 90], ['skulls', 720, 206, 0, 1.25], ['portcullis', 820, 206, 90],
      ['throne', 694, 440, 90], ['serpent', 640, 440, 0], ['portal', 720, 446, 90], ['portal', 862, 488, 0],
      ['stairs', 906, 385, 90, 1], ['door', 936, 385, 90], ['candle', 890, 356], ['candle', 890, 414],
    ],
    landmarks: [['obelisk', 62, 110, 28], ['obelisk', 340, 74, 24], ['keep', 850, 650, 34]], // the arched south gate stands as a keep
    symbols: [['tomb', 130, 104, 16], ['tomb', 200, 72, 15], ['tomb', 300, 116, 15], ['tomb', 396, 84, 14], ['tomb', 160, 136, 13],
      ['tomb', 706, 604, 15], ['tomb', 780, 622, 14], ['tomb', 930, 614, 15], ['tomb', 902, 664, 13], ['tomb', 724, 662, 14], ['monument', 770, 590, 22]],
    trees: [[110, 58, 0.5], [380, 120, 0.45], [770, 650, 0.5]],
    labels: [['The Graveyard of the Ancients', 300, 620, 26, 0]],
    compass: [930, 80],
  },
};

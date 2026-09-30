/* Demo book. The prose is original placeholder text written for this prototype,
   set in the opening situation of Book 1. It is NOT Project Aon's text: their
   licence forbids redistribution, so real book text has to be imported on the
   player's own machine. The shape of this file is what that importer targets.

   Section fields
     loc      key into `locations` (where the map token stands)
     scene    backdrop for illustration and battle
     text     paragraphs
     loot     [{item}|{gold}|{meal}] things that can be taken here
     meal     true = must eat here (Hunting exempts, else -3 EP)
     ep       ENDURANCE change on arrival
     lose     {meal:1}
     combat   {enemies:[{name,cs,ep,sprite,immune,mindforce}], evade:{after,to}, to, csMod, csNote}
     choices  [{text, to, need:{disc}|{item,spend}, random:{table:[[upTo,to],...], mod:[{disc,plus}]}}]
     end      'victory'
*/
(function () {
  const LW = (window.LW = window.LW || {});

  LW.BOOK_DEMO = {
    title: 'Flight from the Dark',
    subtitle: 'Demo: the road to Holmgard',
    start: '1',
    locations: {
      monastery: { x: 150, y: 110, name: 'Kai Monastery' },
      southpath: { x: 285, y: 195, name: 'The South Path' },
      hill: { x: 140, y: 280, name: "Watcher's Hill" },
      clearing: { x: 350, y: 320, name: 'Wagon Clearing' },
      ford: { x: 462, y: 432, name: 'The Ford' },
      log: { x: 540, y: 318, name: 'Fallen Pine' },
      shallows: { x: 418, y: 548, name: 'The Shallows' },
      farbank: { x: 550, y: 468, name: 'East Bank' },
      camp: { x: 735, y: 470, name: 'Night Camp' },
      bridge: { x: 838, y: 552, name: 'Stonewater Bridge' },
      holmgard: { x: 915, y: 628, name: 'Holmgard' },
    },
    sections: {
      1: {
        loc: 'monastery', scene: 'ruins',
        text: [
          'Smoke still climbs from the broken towers of the monastery. Nothing moves among the stones but ash. Every master you ever had lies under that rubble, and you are the last who wears the green cloak.',
          'The king must be told. Holmgard lies far to the south-east, beyond the forest and two rivers, and the sky is no longer safe.',
        ],
        choices: [
          { text: 'Still your mind and listen to your Sixth Sense', to: '2', need: { disc: 'sixthSense' } },
          { text: 'Take the south path into the forest', to: '3' },
          { text: 'Climb the hill to the west and look over the land first', to: '4' },
        ],
      },
      2: {
        loc: 'monastery', scene: 'ruins',
        text: [
          'You close your eyes. When you think of the south path a cold prickle crosses your neck: something is watching it from above. The hill feels quiet.',
        ],
        choices: [
          { text: 'Trust the warning and climb the hill', to: '4' },
          { text: 'Take the south path anyway', to: '3' },
        ],
      },
      3: {
        loc: 'southpath', scene: 'forest',
        text: [
          'The path runs straight under old oaks. You have gone a few hundred paces when a shadow slides across the leaves and you hear wings beating, slow and heavy, above the canopy.',
        ],
        choices: [
          { text: 'Melt into the undergrowth', to: '6', need: { disc: 'camouflage' } },
          { text: 'Throw yourself behind a fallen trunk and hope', random: { table: [[4, '5'], [9, '6']] } },
          { text: 'Stand in the open and draw your weapon', to: '5' },
        ],
      },
      4: {
        loc: 'hill', scene: 'hill',
        text: [
          'From the crown of the hill you can see the whole disaster: the monastery burning behind you, and black specks wheeling over the forest road. To the south-east a river shows silver between the trees.',
          'Near the top lies a body in a green cloak, a Kai lord who got this far with an arrow in him. His pack is still on his shoulder. He would want you to have it.',
        ],
        loot: [{ item: 'potion' }, { gold: 6 }, { meal: 1 }],
        choices: [{ text: 'Go down the far side toward the river', to: '7' }],
      },
      5: {
        loc: 'southpath', scene: 'forest',
        text: [
          'The Kraan has seen you. It folds its wings and drops through the branches, shrieking, claws spread.',
        ],
        combat: { enemies: [{ name: 'Kraan', cs: 14, ep: 18, sprite: 'kraan' }], to: '7' },
      },
      6: {
        loc: 'southpath', scene: 'forest',
        text: [
          'You lie still with your face in the moss. The Kraan circles twice, so low that you can smell it, then beats away north toward the smoke.',
        ],
        choices: [{ text: 'Get up and go on', to: '7' }],
      },
      7: {
        loc: 'clearing', scene: 'forest',
        text: [
          'A supply wagon lies on its side in a clearing, its mule gone and its load scattered. Whoever drove it left in a hurry. Among the sacks there may be something worth carrying.',
        ],
        loot: [{ item: 'sword' }, { meal: 1 }],
        choices: [{ text: 'Follow the wagon ruts down to the river', to: '8' }],
      },
      8: {
        loc: 'ford', scene: 'river',
        text: [
          'The ruts end at a ford. Two Giaks squat on the near bank, arguing over a looted cooking pot, their spears stuck upright in the mud beside them. They have not seen you.',
        ],
        choices: [
          { text: 'Charge them before they reach their spears', to: '9' },
          { text: 'Tip their spears into the river with your mind, then charge', to: '9m', need: { disc: 'mindOverMatter' } },
          { text: 'Look for another way across', to: '10', need: { disc: 'tracking' } },
          { text: 'Go downstream and swim for it', random: { table: [[2, '11a'], [9, '11b']] } },
        ],
      },
      9: {
        loc: 'ford', scene: 'river',
        text: [
          'You are on them in six strides. The nearer Giak snatches its spear and swings round, yellow eyes wide.',
        ],
        combat: {
          enemies: [
            { name: 'Giak Scout', cs: 9, ep: 9, sprite: 'giak' },
            { name: 'Giak Spearman', cs: 10, ep: 10, sprite: 'giak' },
          ],
          evade: { after: 2, to: '11b' }, to: '12',
        },
      },
      '9m': {
        loc: 'ford', scene: 'river',
        text: [
          'You fix your mind on the two spear shafts. They shiver, tilt and slide into the current. The Giaks are still staring after them when you reach the bank.',
        ],
        combat: {
          enemies: [
            { name: 'Giak Scout', cs: 9, ep: 9, sprite: 'giak' },
            { name: 'Giak Spearman', cs: 10, ep: 10, sprite: 'giak' },
          ],
          csMod: 2, csNote: 'Disarmed foes', to: '12',
        },
      },
      10: {
        loc: 'log', scene: 'river',
        text: [
          'Your training shows you what the Giaks missed: deer tracks leading upstream to a pine that has fallen clean across the water. The detour takes most of the afternoon, and you are hungry when you reach the far side.',
        ],
        meal: true,
        choices: [{ text: 'Strike east for the road', to: '12' }],
      },
      '11a': {
        loc: 'shallows', scene: 'river',
        text: [
          'The river is colder and faster than it looked. It rolls you under twice and tears at your pack before you find gravel under your feet.',
        ],
        ep: -3, lose: { meal: 1 },
        choices: [{ text: 'Drag yourself up the bank', to: '12' }],
      },
      '11b': {
        loc: 'shallows', scene: 'river',
        text: [
          'You go in quietly below the bend and let the current carry you across at an angle. You come out dripping on the far bank, unseen.',
        ],
        choices: [{ text: 'Climb the bank', to: '12' }],
      },
      12: {
        loc: 'farbank', scene: 'road',
        text: [
          "Beyond the river the trees thin and you strike the king's road. A man in the livery of the border rangers sits against a milestone, one hand pressed to his side.",
          '"Kai," he says when he sees your cloak. "Then some of you lived."',
        ],
        choices: [
          { text: 'Lay your hands on the wound', to: '13', need: { disc: 'healing' } },
          { text: 'Give him your Laumspur Potion', to: '13', need: { item: 'potion', spend: true } },
          { text: 'Tell him you cannot stay, and walk on', to: '14' },
        ],
      },
      13: {
        loc: 'farbank', scene: 'road',
        text: [
          'The bleeding slows and the ranger breathes easier.',
          '"There is a Vordak at the bridge with the Giaks," he says. "It breaks a man\'s mind before it breaks his bones. If you cannot shield your thoughts, go under the bridge, not over it." He pushes his purse and his rations into your hands and will not take them back.',
        ],
        loot: [{ gold: 8 }, { meal: 1 }],
        choices: [{ text: 'Thank him and go on down the road', to: '14' }],
      },
      14: {
        loc: 'camp', scene: 'night',
        text: [
          'You walk until the light fails, then make a cold camp in a hollow off the road. No fire. Twice in the night something large passes overhead.',
        ],
        meal: true,
        choices: [{ text: 'Go on to the bridge at first light', to: '15' }],
      },
      15: {
        loc: 'bridge', scene: 'bridge',
        text: [
          'The stone bridge is the only dry way over the second river, and it is held. A squad of Giaks idles at the near end. Among them stands a figure in a red robe, hooded, perfectly still.',
          'You feel it searching: a pressure behind your eyes.',
        ],
        choices: [
          { text: 'Walk out and challenge the Vordak', to: '16' },
          { text: 'Creep through the reeds under the first arch', random: { table: [[3, '16s'], [99, '17']], mod: [{ disc: 'camouflage', plus: 2 }] } },
        ],
      },
      16: {
        loc: 'bridge', scene: 'bridge',
        text: [
          'The Giaks scatter from your path; this is not their fight. The Vordak raises a black mace, and its voice scrapes along the inside of your skull.',
        ],
        combat: { enemies: [{ name: 'Vordak', cs: 16, ep: 20, sprite: 'vordak', mindforce: 2 }], to: '17' },
      },
      '16s': {
        loc: 'bridge', scene: 'bridge',
        text: [
          'A reed snaps. The hooded head turns and the pressure in your skull becomes a spike. It is on the bank above you before you can stand.',
        ],
        combat: {
          enemies: [{ name: 'Vordak', cs: 16, ep: 20, sprite: 'vordak', mindforce: 2 }],
          csMod: -2, csNote: 'Caught in the mud', to: '17',
        },
      },
      17: {
        loc: 'holmgard', scene: 'city', end: 'victory',
        text: [
          'By noon the road crests a last rise. Below lie the white walls of Holmgard and the banners of the king, still flying.',
          'You are tired, hungry, and the last of your order. You start down the hill.',
        ],
      },
    },
  };
})();

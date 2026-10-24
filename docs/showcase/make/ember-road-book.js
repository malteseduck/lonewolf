({
  id: '99ember', number: 99, series: 'kai', title: 'The Ember Road', subtitle: 'A stand-in book written for this deck',
  start: '1', assets: 'demo-book/', map: 'map-4k.webp',
  intro: [
    'The Emberlands have known no peace since the Old Hold burned. Roads that once carried grain now carry rumour, and the rumours all say the same thing: that something is waking in the ash.',
    'You carry a sealed letter for the warden of Thornwick, and you have been told to read it to no one. The road is long, the light is going, and you are not the only one who has walked it today.'
  ],
  sections: {
    '1': { text: [
        'The road to Thornwick climbs out of the marsh as the light fails. Behind you the Gloamwater lies flat and black; ahead, a gatehouse squats across the way, its portcullis half raised like a lip about to speak.',
        'Smoke rises from somewhere beyond the walls, though the wind is wrong for a hearth fire. Your hand finds the letter inside your coat and stays there.' ],
      img: { file: 'ill1.png', full: false, at: 1 },
      choices: [
        { text: 'If you wish to use your Kai Discipline of Sixth Sense, turn to 14.', to: '14', need: { disc: 'sixthSense' } },
        { text: 'If you wish to approach the gatehouse openly, turn to 27.', to: '27' },
        { text: 'If you wish to leave the road and skirt the walls through the reeds, turn to 38.', to: '38' } ] },
    '14': { text: ['Something under the portcullis is watching you. You feel it as a cold finger on the back of the neck, and you step wide of the road before it can decide to move.'], choices: [{ text: 'Turn to 38.', to: '38' }] },
    '27': { text: [
        'You walk up the middle of the road with your empty hand held where it can be seen. Halfway to the gate, a hound the colour of old ash slides out of the shadow beneath the portcullis. Its master is nowhere to be seen.',
        'You must fight it.' ],
      combat: { enemies: [{ name: 'Ashmaw', cs: 15, ep: 24, art: 'foe1.png' }] },
      choices: [{ text: 'If you win, turn to 38.', to: '38' }] },
    '38': { text: ['The reeds close over your head and the sound of the road falls away. Somewhere ahead, water is moving that should be still.'], choices: [{ text: 'Continue.', to: '1' }] }
  }
})

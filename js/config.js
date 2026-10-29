/* ==========================================================================
   TIDALIA — content config: realms, chapters, archive seeds
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});

  T.config = {
    brand: 'Tidalia',
    tagline: 'Compose the ocean inside your head.',

    /* story chapters shown over the scroll-driven 3D journey.
       progress = [in, full, out, gone] across the hero timeline (0..1) */
    chapters: [
      {
        no: '01', side: 'left', at: [0.055, 0.10, 0.20, 0.245],
        title: 'Every track starts below the surface.',
        body: 'A record spinning in the dark, four kilometres down. This is where the first note lives.'
      },
      {
        no: '02', side: 'right', at: [0.30, 0.345, 0.44, 0.485],
        title: 'Memory, pressed into vinyl.',
        body: 'A feeling you can\'t name becomes a waveform. Tidalia keeps the texture — the hiss, the warmth, the weight.'
      },
      {
        no: '03', side: 'left', at: [0.53, 0.565, 0.645, 0.685],
        title: 'Then it learns the tide.',
        body: 'Instruments enter the way water does — not all at once, but inevitably.'
      },
      {
        no: '04', side: 'right', at: [0.72, 0.755, 0.845, 0.885],
        title: 'And you arrive somewhere that never existed.',
        body: 'Six realms. Infinite arrangements. One lagoon that is only yours.'
      }
    ],

    /* interactive 3D carousel — 6 realms */
    realms: [
      {
        id: 'reef', name: 'Reef of Echoes', img: 'assets/realms/reef.jpg', thumb: 'assets/thumbs/reef.jpg',
        accent: '#46e0ff', seed: 'reef',
        desc: 'A drowned city of coral pipes. Notes bend the way light does through water, and every melody returns to you twice.',
        tags: ['ambient', 'choral', 'drowned city'], bpm: 62, key: 'D♭ Major'
      },
      {
        id: 'chrome', name: 'Chrome Desert', img: 'assets/realms/chrome.jpg', thumb: 'assets/thumbs/chrome.jpg',
        accent: '#cfd8ff', seed: 'chrome',
        desc: 'Liquid metal dunes shifting under a twilight sky. Music here is sharp, precise, and reflects everything you bring to it.',
        tags: ['synthwave', 'minimal', 'wide screen'], bpm: 104, key: 'F♯ Minor'
      },
      {
        id: 'lantern', name: 'Lantern Sea', img: 'assets/realms/lantern.jpg', thumb: 'assets/thumbs/lantern.jpg',
        accent: '#ffb37a', seed: 'lantern',
        desc: 'Ten thousand paper lanterns adrift on glass-still water. Warm, patient arrangements that keep a slow, human pulse.',
        tags: ['folk', 'warm', 'slow pulse'], bpm: 74, key: 'A Major'
      },
      {
        id: 'ice', name: 'Ice Cathedral', img: 'assets/realms/ice.jpg', thumb: 'assets/thumbs/ice.jpg',
        accent: '#9fe8ff', seed: 'ice',
        desc: 'A frozen vault with a whale inside the wall. Cold reverbs, enormous silences, and a choir heard from very far away.',
        tags: ['cinematic', 'choir', 'vast'], bpm: 58, key: 'C Minor'
      },
      {
        id: 'jungle', name: 'Midnight Jungle', img: 'assets/realms/jungle.jpg', thumb: 'assets/thumbs/jungle.jpg',
        accent: '#7dff9b', seed: 'jungle',
        desc: 'Glowing spores drift between sleeping trees. Rhythms here are organic, hand-played, and slightly out of time — on purpose.',
        tags: ['percussive', 'organic', 'hypnotic'], bpm: 92, key: 'G Minor'
      },
      {
        id: 'lagoon', name: 'Cassette Lagoon', img: 'assets/realms/lagoon.jpg', thumb: 'assets/thumbs/lagoon.jpg',
        accent: '#ff5fa2', seed: 'lagoon',
        desc: 'The home shoreline, where the tape hiss lives. Lofi, nostalgic, cassette-warm — the sound of a memory you replay too often.',
        tags: ['lofi', 'nostalgic', 'tape'], bpm: 86, key: 'E♭ Major'
      }
    ],

    /* archive seeds used when localStorage is empty */
    archive: [
      { title: 'Aphelion Tide', realm: 'reef', prompt: 'the sound of a tide coming back for something it lost', bpm: 62, key: 'D♭ Major', dur: 214, tags: ['ambient', 'choral'] },
      { title: 'Chrome Rainfall', realm: 'chrome', prompt: 'neon rain on a highway at 2am, but the car is a synth', bpm: 104, key: 'F♯ Minor', dur: 188, tags: ['synthwave'] },
      { title: 'Lanterns, Slowly', realm: 'lantern', prompt: 'a village lighting its lamps one by one at dusk', bpm: 74, key: 'A Major', dur: 246, tags: ['folk', 'warm'] },
      { title: 'Cathedral Static', realm: 'ice', prompt: 'choir practice heard through a frozen lake', bpm: 58, key: 'C Minor', dur: 302, tags: ['cinematic'] },
      { title: 'Spore Bloom', realm: 'jungle', prompt: 'mushrooms breathing in a forest at midnight', bpm: 92, key: 'G Minor', dur: 176, tags: ['percussive'] },
      { title: 'Side B, Rewound', realm: 'lagoon', prompt: 'a cassette you played every summer until it wore out', bpm: 86, key: 'E♭ Major', dur: 164, tags: ['lofi', 'tape'] },
      { title: 'Pressure & Chorus', realm: 'reef', prompt: 'four kilometres down, where the whales keep time', bpm: 66, key: 'B♭ Minor', dur: 258, tags: ['ambient'] },
      { title: 'Dune Mirror', realm: 'chrome', prompt: 'a desert that reflects the sky it never touches', bpm: 96, key: 'A Minor', dur: 202, tags: ['minimal'] },
      { title: 'Last Lamp Home', realm: 'lantern', prompt: 'the long walk back with one lantern left', bpm: 70, key: 'D Major', dur: 232, tags: ['folk'] }
    ],

    suggestions: [
      'a rainstorm remembered through a car window',
      'ocean at midnight, but hopeful',
      'neon rain drive',
      'cathedral of ice',
      'a lullaby for machines',
      'the last day of summer, slowed down'
    ]
  };
})();

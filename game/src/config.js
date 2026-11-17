// Palmera Bay — tuning, palette and world constants. One place for every number
// the rest of the game shares, so a balance tweak never needs a hunt.
(function () {
  var PB = window.PB = window.PB || {};

  PB.TITLE = 'PALMERA BAY';
  PB.SUBTITLE = 'an open-world story in one sun-soaked city';

  // World: a coastal city, streets on a grid, beach along the south edge.
  PB.WORLD_W = 2400;
  PB.WORLD_H = 1800;
  PB.BEACH_Y = 1560;          // everything below this line is sand, then water
  PB.WATER_Y = 1700;
  PB.ROAD_SPACING = 240;      // distance between street centrelines
  PB.ROAD_W = 72;             // street width, kerb to kerb
  PB.SIDEWALK = 14;           // pavement strip along each street

  // Canvas the game renders into (the page keeps it at 1280x800).
  PB.VIEW_W = 1280;
  PB.VIEW_H = 800;

  // Player on foot.
  PB.WALK_SPEED = 175;
  PB.RUN_SPEED = 265;
  PB.PLAYER_RADIUS = 13;
  PB.PLAYER_HEALTH = 100;

  // Driving.
  PB.CAR_TOP_SPEED = 430;     // px/s, sports car
  PB.CAR_ACCEL = 320;
  PB.CAR_BRAKE = 620;
  PB.CAR_REVERSE_TOP = 150;
  PB.CAR_TURN = 2.9;          // rad/s at full lock, scaled by speed
  PB.CAR_RADIUS = 17;
  PB.TRAFFIC_SPEED = 120;

  // Wanted level.
  PB.WANTED_MAX = 5;
  PB.WANTED_DECAY_SECONDS = 25; // quiet seconds before one star drops
  PB.COP_TOP_SPEED = 400;
  PB.COP_SPAWN_DIST = 620;    // cops appear just off screen
  PB.BUST_RADIUS = 30;
  PB.BUST_SECONDS = 1.1;      // a cop must stay this close this long

  // Money.
  PB.START_CASH = 150;

  // Sun-soaked palette: warm asphalt, pale sand, pastel walls, teal water.
  PB.PALETTE = {
    grass: '#7fae5a',
    grassDark: '#74a24f',
    sand: '#e8d29a',
    water: '#2f9db4',
    waterDeep: '#1f7f9e',
    road: '#3a3f4a',
    roadLine: '#e8d44f',
    sidewalk: '#b9b3a4',
    kerb: '#8f8a7c',
    buildingRoof: ['#e07856', '#e8a34c', '#7fb3d5', '#c97b9b', '#9db380', '#d5c06a'],
    buildingWall: ['#f2e3c6', '#e8d9b8', '#dfe8ee', '#f0d7cf', '#e2e8d5'],
    park: '#5d9b4a',
    palmTrunk: '#7a5a38',
    palmLeaf: '#3f8f4f',
    carPlayer: '#e8452c',
    carPolice: '#1d4fd7',
    carTraffic: ['#d8d8d8', '#3c6e9e', '#c9a227', '#7a4a8a', '#4a7a5c', '#b8563a'],
    hudPanel: 'rgba(8, 12, 24, 0.72)',
    hudText: '#f2ead8',
    hudAccent: '#ffd94a',
    star: '#ffd94a',
    starEmpty: '#5a5f6e'
  };

  // Mission rewards, in order. The story is told by missions.js.
  PB.MISSION_REWARDS = [500, 800, 1500];

  // Screenshot staging reads these from the URL (?shot=cover&seed=1).
  PB.SHOT_SEED = 1;
})();

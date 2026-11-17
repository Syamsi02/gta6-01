// Palmera Bay — screenshot staging. The maker takes screenshots through the
// URL (?shot=cover&seed=1): each named shot builds a real scene from the
// game's own systems — a chase, a theft, a delivery, the title — settles it for
// a fixed number of frames, then holds the frame for the capture.
(function () {
  var PB = window.PB = window.PB || {};

  var SHOTS = {
    // Cover: Rio mid-chase downtown, three stars, cruisers right on his tail.
    cover: function (game, rng) {
      var player = PB.player.state;
      player.x = 1200; player.y = 600;
      var car = PB.vehicles.makeCar(1200, 600, 0, PB.PALETTE.carPlayer, 'player');
      PB.vehicles.list.push(car);
      player.inCar = car;
      car.speed = 240;
      PB.police.wanted = 3;
      PB.police.spawnCruiser(game, rng, player);
      PB.police.spawnCruiser(game, rng, player);
      // Pull the cruisers in close behind Rio so the chase reads in one frame.
      var cops = PB.police.list;
      if (cops[0] && cops[0].car) {
        cops[0].car.x = 990; cops[0].car.y = 616;
        cops[0].car.heading = 0; cops[0].car.speed = 300;
        cops[0].x = 990; cops[0].y = 616;
      }
      if (cops[1] && cops[1].car) {
        cops[1].car.x = 920; cops[1].car.y = 584;
        cops[1].car.heading = 0; cops[1].car.speed = 290;
        cops[1].x = 920; cops[1].y = 584;
      }
      // Traffic ahead, so the street feels alive.
      var ahead = PB.vehicles.makeCar(1560, 600, Math.PI, rng.pick(PB.PALETTE.carTraffic), 'traffic');
      ahead.speed = PB.TRAFFIC_SPEED;
      PB.vehicles.list.push(ahead);
      PB.vehicles.spawnTraffic(rng, 1200, 600);
      PB.vehicles.spawnTraffic(rng, 1200, 600);
      PB.pedestrians.spawnNear(rng, 1200, 600, 6);
      PB.missions.startNext(game);
      game.messages.push({ text: 'Job: First Wheels — deliver the car to Sal\u2019s garage', at: performance.now() });
      // Snap the camera onto Rio so the staged frame is centred from the start.
      game.camera.x = player.x;
      game.camera.y = player.y;
    },
    // On foot: Rio beside a parked car, one star, a cruiser closing in.
    foot: function (game, rng) {
      var player = PB.player.state;
      player.x = 600; player.y = 336;
      PB.police.wanted = 1;
      PB.police.spawnCruiser(game, rng, player);
      // Bring the cruiser down the same street, close enough to see.
      var cops = PB.police.list;
      if (cops[0] && cops[0].car) {
        cops[0].car.x = 600; cops[0].car.y = 120;
        cops[0].car.heading = Math.PI / 2; cops[0].car.speed = 260;
        cops[0].x = 600; cops[0].y = 120;
      }
      PB.vehicles.spawnTraffic(rng, 600, 336);
      PB.pedestrians.spawnNear(rng, 600, 336, 8);
      // Snap the camera onto Rio; the parked car at (780, 336) sits in frame.
      game.camera.x = player.x;
      game.camera.y = player.y;
    },
    // Mission: the pier pickup, package in hand, three stars behind him.
    mission: function (game, rng) {
      var player = PB.player.state;
      var pier = PB.city.pier;
      player.x = pier.x + 90; player.y = pier.y - 80;
      var car = PB.vehicles.makeCar(pier.x + 90, pier.y - 80, Math.PI / 2, PB.PALETTE.carPlayer, 'player');
      PB.vehicles.list.push(car);
      player.inCar = car;
      car.speed = 200;
      PB.police.wanted = 3;
      PB.police.spawnCruiser(game, rng, player);
      PB.police.spawnCruiser(game, rng, player);
      // Pull the cruisers in close behind Rio so the chase reads in one frame.
      var cops = PB.police.list;
      if (cops[0] && cops[0].car) {
        cops[0].car.x = pier.x - 60; cops[0].car.y = pier.y - 260;
        cops[0].car.heading = Math.PI / 2; cops[0].car.speed = 280;
        cops[0].x = pier.x - 60; cops[0].y = pier.y - 260;
      }
      if (cops[1] && cops[1].car) {
        cops[1].car.x = pier.x + 220; cops[1].car.y = pier.y - 320;
        cops[1].car.heading = Math.PI / 2; cops[1].car.speed = 270;
        cops[1].x = pier.x + 220; cops[1].y = pier.y - 320;
      }
      PB.vehicles.spawnTraffic(rng, pier.x, pier.y);
      // Mission 3, "The Drop": package already picked up, run it to the lighthouse.
      PB.missions.reset(2, ['first-wheels', 'hot-wheels']);
      PB.missions.startNext(game);
      PB.missions.active.step = 1;
      PB.missions.active.carrying = true;
      game.messages.push({ text: 'Package secured. Now run it to the lighthouse!', at: performance.now() });
      game.camera.x = player.x;
      game.camera.y = player.y;
    },
    // Title: the start screen over a slow pan of the city.
    title: function (game, rng) {
      game.state = 'title';
      game.camera.x = 1200;
      game.camera.y = 700;
    }
  };

  PB.shots = {
    // Parse the URL once at boot. Returns null when this is a normal play run.
    parse: function () {
      try {
        var q = new URLSearchParams(window.location.search);
        var shot = q.get('shot');
        if (!shot || !SHOTS[shot]) return null;
        var seed = parseInt(q.get('seed') || '1', 10);
        if (isNaN(seed)) seed = 1;
        return { name: shot, seed: seed };
      } catch (e) {
        return null;
      }
    },

    // Stage the named scene, then step the world a fixed number of frames so
    // traffic, police and particles settle before the capture holds the frame.
    stage: function (game, shot) {
      var rng = PB.makeRng(shot.seed * 7919 + 13);
      game.state = 'playing';
      PB.player.reset(600, 600);
      PB.vehicles.reset(rng);
      PB.pedestrians.reset(rng);
      PB.police.reset();
      PB.missions.reset(0, []);
      SHOTS[shot.name](game, rng);
      game.shotMode = true;
      game.shotFrames = 0;
    },

    step: function (game, dt) {
      if (!game.shotMode) return false;
      game.shotFrames += 1;
      // Sixty frames is enough for the chase to form up and the camera to settle.
      return game.shotFrames >= 60;
    }
  };
})();

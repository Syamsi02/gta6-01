// Palmera Bay — the wanted level and the police. Crimes raise the stars, the
// stars bring cruisers and foot cops, and quiet time lets the heat die down.
// Get caught on foot and it is over; lose them in a car and the city forgets.
(function () {
  var PB = window.PB = window.PB || {};

  var cops = [];
  var wanted = 0;
  var quietTimer = 0;
  var spawnTimer = 0;
  var bustTimer = 0;

  PB.police = {
    list: cops,
    get wanted() { return wanted; },
    set wanted(v) { wanted = PB.clamp(Math.round(v), 0, PB.WANTED_MAX); },

    reset: function () {
      cops.length = 0;
      wanted = 0;
      quietTimer = 0;
      spawnTimer = 0;
      bustTimer = 0;
    },

    addWanted: function (stars) {
      wanted = PB.clamp(wanted + stars, 0, PB.WANTED_MAX);
      quietTimer = 0;
    },

    // A cop goes down: more heat, and a message for the feed.
    dropCop: function (cop, game) {
      PB.police.removeCop(cop);
      PB.police.addWanted(2);
      if (game) game.onCrime('copDown', 0);
      PB.gameMessage('You dropped a cop — the whole city is after you now.');
    },

    removeCop: function (cop) {
      var i = cops.indexOf(cop);
      if (i >= 0) cops.splice(i, 1);
      if (cop.car) PB.vehicles.removeCar(cop.car);
    },

    update: function (dt, game, rng) {
      var player = PB.player.state;
      if (!player) return;

      // Quiet time decays the heat, one star at a time.
      if (wanted > 0) {
        var nearest = Infinity;
        cops.forEach(function (c) {
          nearest = Math.min(nearest, PB.dist(c.x, c.y, player.x, player.y));
        });
        if (nearest > 520) {
          quietTimer += dt;
          if (quietTimer >= PB.WANTED_DECAY_SECONDS) {
            wanted -= 1;
            quietTimer = 0;
            if (wanted === 0) PB.gameMessage('You lost them. The heat is off.');
            else PB.gameMessage('The heat is dying down… ' + wanted + ' stars left.');
          }
        } else {
          quietTimer = 0;
        }
      }

      // Reinforcements: up to one cruiser per star, plus foot cops at 2+.
      spawnTimer -= dt;
      if (wanted > 0 && spawnTimer <= 0) {
        spawnTimer = 2.5;
        var wantCars = Math.min(wanted, 3);
        var haveCars = cops.filter(function (c) { return !c.onFoot; }).length;
        if (haveCars < wantCars) PB.police.spawnCruiser(game, rng, player);
        if (wanted >= 2) {
          var haveFoot = cops.filter(function (c) { return c.onFoot; }).length;
          if (haveFoot < wanted - 1) PB.police.spawnFootCop(game, rng, player);
        }
      }

      // Chase, ram, arrest.
      for (var i = cops.length - 1; i >= 0; i--) {
        var cop = cops[i];
        if (cop.onFoot) PB.police.updateFootCop(dt, cop, player, game);
        else PB.police.updateCruiser(dt, cop, player, game);
        // Cops far behind give up and despawn.
        if (PB.dist(cop.x, cop.y, player.x, player.y) > 1400) PB.police.removeCop(cop);
      }

      // Busted: a foot cop holding Rio still for long enough.
      if (wanted > 0 && !player.inCar) {
        var close = false;
        cops.forEach(function (c) {
          if (c.onFoot && PB.dist(c.x, c.y, player.x, player.y) < PB.BUST_RADIUS) close = true;
        });
        if (close) {
          bustTimer += dt;
          if (bustTimer >= PB.BUST_SECONDS) PB.gameOver('busted');
        } else {
          bustTimer = 0;
        }
      } else {
        bustTimer = 0;
      }
      PB.audio.siren(wanted, dt);
    },

    spawnCruiser: function (game, rng, player) {
      // Appear on a road ahead of the player's direction of travel.
      var a = rng.range(0, Math.PI * 2);
      var x = player.x + Math.cos(a) * PB.COP_SPAWN_DIST;
      var y = player.y + Math.sin(a) * PB.COP_SPAWN_DIST;
      var road = PB.city.nearestRoadPoint(
        PB.clamp(x, 60, PB.WORLD_W - 60),
        PB.clamp(y, 60, PB.BEACH_Y - 60));
      var car = PB.vehicles.makeCar(road.x, road.y, PB.angleTo(road.x, road.y, player.x, player.y),
        PB.PALETTE.carPolice, 'police');
      car.hp = 140;
      PB.vehicles.list.push(car);
      cops.push({ x: car.x, y: car.y, onFoot: false, car: car, hp: 100, stuckTimer: 0 });
    },

    spawnFootCop: function (game, rng, player) {
      var a = rng.range(0, Math.PI * 2);
      var x = PB.clamp(player.x + Math.cos(a) * 320, 40, PB.WORLD_W - 40);
      var y = PB.clamp(player.y + Math.sin(a) * 320, 40, PB.BEACH_Y - 40);
      if (PB.city.solidAt(x, y, 12)) return;
      cops.push({ x: x, y: y, onFoot: true, car: null, hp: 100, stuckTimer: 0, shootCooldown: 1 });
    },

    updateCruiser: function (dt, cop, player, game) {
      var car = cop.car;
      if (!car || car.wrecked) {
        // The cruiser is wrecked: its cop gets out on foot, angry.
        if (car && car.wrecked) {
          PB.vehicles.removeCar(car);
          cop.car = null;
          cop.onFoot = true;
          cop.x = car.x;
          cop.y = car.y;
          cop.hp = 100;
        }
        return;
      }
      // Pursuit steering: aim at the player, with a little wobble.
      var want = PB.angleTo(car.x, car.y, player.x, player.y);
      var diff = PB.angleDiff(car.heading, want);
      var steer = PB.clamp(diff * 1.6, -1, 1);
      var throttle = Math.abs(diff) > 2.2 ? -0.5 : 1;
      PB.vehicles.drive(car, throttle, steer, dt);
      cop.x = car.x;
      cop.y = car.y;

      // A cruiser ramming Rio on foot hurts him.
      if (!player.inCar && PB.dist(car.x, car.y, player.x, player.y) < 34) {
        PB.player.hurt(25);
        car.speed *= 0.3;
      }
      // Ramming the player's car damages it.
      if (player.inCar && PB.dist(car.x, car.y, player.x, player.y) < 40) {
        var pc = player.inCar;
        pc.hp -= 8;
        car.speed *= 0.6;
        PB.audio.thud();
        if (pc.hp <= 0 && !pc.wrecked) {
          pc.wrecked = true;
          pc.speed = 0;
        }
      }
    },

    updateFootCop: function (dt, cop, player, game) {
      var speed = 195;
      var d = PB.dist(cop.x, cop.y, player.x, player.y);
      if (player.inCar) {
        // On foot they cannot catch a car: fall back to the nearest road.
        if (d > 700) return;
      }
      var a = PB.angleTo(cop.x, cop.y, player.x, player.y);
      var nx = cop.x + Math.cos(a) * speed * dt;
      var ny = cop.y + Math.sin(a) * speed * dt;
      if (!PB.city.solidAt(nx, ny, 10)) {
        cop.x = nx;
        cop.y = ny;
      }
      // A foot cop close to Rio on foot starts swinging.
      if (!player.inCar && d < 30) PB.player.hurt(12);
      // A foot cop shoots at a fleeing car from range.
      cop.shootCooldown -= dt;
      if (player.inCar && d < 320 && d > 60 && cop.shootCooldown <= 0) {
        cop.shootCooldown = 1.4;
        var pc = player.inCar;
        pc.hp -= 4;
        game.addTracer(cop.x, cop.y, a);
        if (pc.hp <= 0 && !pc.wrecked) {
          pc.wrecked = true;
          pc.speed = 0;
        }
      }
    }
  };
})();

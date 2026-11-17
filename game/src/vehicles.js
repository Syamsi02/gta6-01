// Palmera Bay — vehicles. One car object serves the player's ride, parked cars
// waiting to be stolen, and traffic: the same arcade physics, different drivers.
(function () {
  var PB = window.PB = window.PB || {};

  var cars = [];
  var nextId = 1;
  var MAX_TRAFFIC = 14;

  function baseCar(x, y, heading, color, kind) {
    return {
      id: nextId++,
      x: x, y: y,
      heading: heading,
      speed: 0,
      color: color,
      kind: kind,          // player | traffic | parked | police
      length: 46, width: 22,
      r: PB.CAR_RADIUS,
      hp: 100,
      // Traffic brains only.
      axis: 'h', dir: 1, lane: 0,
      turnCooldown: 0,
      // Wreck state.
      wrecked: false, smokeTimer: 0
    };
  }

  function spawnPointOnRoad(rng, nearX, nearY) {
    for (var tries = 0; tries < 16; tries++) {
      var useVertical = rng.chance(0.5);
      var x, y, axis;
      if (useVertical) {
        x = rng.pick(PB.city.roadXs);
        y = rng.range(80, PB.BEACH_Y - 80);
        axis = 'v';
      } else {
        x = rng.range(80, PB.WORLD_W - 80);
        y = rng.pick(PB.city.roadYs);
        axis = 'h';
      }
      if (nearX !== undefined && PB.dist(x, y, nearX, nearY) < 260) continue;
      if (PB.dist(x, y, nearX || 0, nearY || 0) > 900) continue;
      return { x: x, y: y, axis: axis };
    }
    return { x: PB.city.roadXs[2], y: 300, axis: 'v' };
  }

  PB.vehicles = {
    list: cars,

    makeCar: baseCar,

    reset: function (rng) {
      cars.length = 0;
      nextId = 1;
      // A few parked cars near the start corner, for the first mission.
      var spots = [
        { x: 300, y: 96, heading: 0 },
        { x: 540, y: 96, heading: Math.PI },
        { x: 96, y: 540, heading: Math.PI / 2 },
        { x: 780, y: 336, heading: -Math.PI / 2 },
        { x: 1020, y: 96, heading: 0 }
      ];
      spots.forEach(function (s) {
        cars.push(baseCar(s.x, s.y, s.heading, rng.pick(PB.PALETTE.carTraffic), 'parked'));
      });
      for (var i = 0; i < 8; i++) PB.vehicles.spawnTraffic(rng, 600, 600);
    },

    spawnTraffic: function (rng, nearX, nearY) {
      if (cars.filter(function (c) { return c.kind === 'traffic'; }).length >= MAX_TRAFFIC) return null;
      var p = spawnPointOnRoad(rng, nearX, nearY);
      var car = baseCar(p.x, p.y, p.axis === 'h' ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2),
        rng.pick(PB.PALETTE.carTraffic), 'traffic');
      car.axis = p.axis;
      car.dir = rng.chance(0.5) ? 1 : -1;
      car.lane = (rng.chance(0.5) ? 1 : -1) * 16;
      car.speed = PB.TRAFFIC_SPEED * rng.range(0.8, 1.1);
      cars.push(car);
      return car;
    },

    // Parked cars the player can steal. Nearest one within reach, if any.
    nearestParked: function (x, y, maxDist) {
      var best = null, bestD = maxDist;
      cars.forEach(function (c) {
        if (c.kind !== 'parked') return;
        var d = PB.dist(x, y, c.x, c.y);
        if (d < bestD) { bestD = d; best = c; }
      });
      return best;
    },

    removeCar: function (car) {
      var i = cars.indexOf(car);
      if (i >= 0) cars.splice(i, 1);
    },

    // Arcade driving: accelerate along the heading, steer harder at low speed.
    drive: function (car, throttle, steer, dt) {
      if (car.wrecked) { car.speed *= (1 - 2 * dt); return; }
      var top = car.kind === 'police' ? PB.COP_TOP_SPEED : PB.CAR_TOP_SPEED;
      if (throttle > 0) car.speed += PB.CAR_ACCEL * throttle * dt;
      else if (throttle < 0) {
        if (car.speed > 20) car.speed -= PB.CAR_BRAKE * dt;
        else car.speed -= PB.CAR_ACCEL * 0.5 * dt;
      } else {
        car.speed -= car.speed * 0.9 * dt;
      }
      car.speed = PB.clamp(car.speed, -PB.CAR_REVERSE_TOP, top);
      var spd01 = Math.min(1, Math.abs(car.speed) / top);
      var steerScale = car.speed >= 0 ? 1 : -1;
      car.heading += steer * PB.CAR_TURN * spd01 * steerScale * dt * (0.45 + 0.55 * (1 - spd01 * 0.5));

      var nx = car.x + Math.cos(car.heading) * car.speed * dt;
      var ny = car.y + Math.sin(car.heading) * car.speed * dt;
      var hit = PB.city.solidAt(nx, ny, car.r);
      if (!hit) {
        car.x = nx;
        car.y = ny;
      } else {
        // Slide along the wall: keep the free axis, kill the blocked one.
        if (!PB.city.solidAt(nx, car.y, car.r)) car.x = nx;
        else if (!PB.city.solidAt(car.x, ny, car.r)) car.y = ny;
        else car.speed *= 0.4;
        if (Math.abs(car.speed) > 200) {
          car.hp -= 6;
          PB.audio.thud();
          if (car.hp <= 0 && !car.wrecked) {
            car.wrecked = true;
            car.speed = 0;
          }
        }
      }
      car.x = PB.clamp(car.x, 20, PB.WORLD_W - 20);
      car.y = PB.clamp(car.y, 20, PB.WORLD_H - 20);
      if (car.wrecked) car.smokeTimer += dt;
    },

    // Traffic brains: cruise the lane, slow for the car ahead, turn at corners.
    updateTraffic: function (dt, rng) {
      cars.forEach(function (car) {
        if (car.kind !== 'traffic') return;
        car.turnCooldown -= dt;
        var aheadX = car.x + Math.cos(car.heading) * 70;
        var aheadY = car.y + Math.sin(car.heading) * 70;
        var blocked = false;
        cars.forEach(function (other) {
          if (other === car) return;
          if (PB.dist(aheadX, aheadY, other.x, other.y) < 46) blocked = true;
        });
        var target = blocked ? 0 : PB.TRAFFIC_SPEED;
        car.speed += (target - car.speed) * Math.min(1, 2.5 * dt);

        // At a crossing, sometimes turn onto the other street.
        var onCrossing = PB.city.onRoad(car.x, car.y) &&
          Math.abs(car.x - Math.round(car.x / PB.ROAD_SPACING) * PB.ROAD_SPACING) < 60;
        if (car.turnCooldown <= 0 && onCrossing && rng.chance(0.25)) {
          if (car.axis === 'h') {
            car.axis = 'v';
            car.heading = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
          } else {
            car.axis = 'h';
            car.heading = rng.chance(0.5) ? 0 : Math.PI;
          }
          car.turnCooldown = 2;
        }

        // Nudge back onto the lane centreline.
        var road = PB.city.nearestRoadPoint(car.x, car.y);
        if (road) {
          if (road.axis === 'v') car.x += (road.x + car.lane - car.x) * Math.min(1, 1.2 * dt);
          else car.y += (road.y + car.lane - car.y) * Math.min(1, 1.2 * dt);
        }
        car.x += Math.cos(car.heading) * car.speed * dt;
        car.y += Math.sin(car.heading) * car.speed * dt;
        if (PB.city.solidAt(car.x, car.y, car.r)) {
          car.x -= Math.cos(car.heading) * car.speed * dt;
          car.y -= Math.sin(car.heading) * car.speed * dt;
          car.heading += Math.PI;
          car.speed = PB.TRAFFIC_SPEED * 0.5;
        }
      });
    },

    update: function (dt, rng, playerX, playerY) {
      PB.vehicles.updateTraffic(dt, rng);
      // Fresh traffic keeps the streets alive near the player.
      if (rng.chance(dt * 0.5)) PB.vehicles.spawnTraffic(rng, playerX, playerY);
      // Wrecks get towed after a while.
      for (var i = cars.length - 1; i >= 0; i--) {
        if (cars[i].wrecked && cars[i].smokeTimer > 14) cars.splice(i, 1);
      }
    }
  };
})();

// Palmera Bay — pedestrians. They stroll the sidewalks, cross at corners, and
// run when a gun goes off or a car bears down on them. Hitting one is a crime.
(function () {
  var PB = window.PB = window.PB || {};

  var peds = [];
  var MAX_PEDS = 26;

  function randomSidewalkPoint(rng, nearX, nearY) {
    for (var tries = 0; tries < 12; tries++) {
      var road = rng.pick(PB.city.roadXs);
      var along = rng.range(0, PB.BEACH_Y);
      var side = rng.chance(0.5) ? 1 : -1;
      var x = road + side * (PB.ROAD_W / 2 + PB.SIDEWALK / 2);
      var y = along;
      if (nearX !== undefined && PB.dist(x, y, nearX, nearY) > 700) continue;
      if (PB.city.solidAt(x, y, 8)) continue;
      return { x: x, y: y };
    }
    return { x: PB.city.roadXs[2], y: 300 };
  }

  function makePed(rng, nearX, nearY) {
    var p = randomSidewalkPoint(rng, nearX, nearY);
    var target = randomSidewalkPoint(rng, p.x, p.y);
    return {
      x: p.x, y: p.y,
      tx: target.x, ty: target.y,
      speed: rng.range(34, 58),
      heading: 0,
      state: 'walk',       // walk | flee | down
      downTimer: 0,
      fleeX: 0, fleeY: 0,
      color: rng.pick(['#d95f4b', '#4b7fd9', '#e8c85a', '#7fb069', '#9b5fb0', '#e8e8e8']),
      skin: rng.pick(['#e8b98a', '#c98d5f', '#8a5a3b', '#f0c8a0']),
      bob: rng.range(0, Math.PI * 2)
    };
  }

  PB.pedestrians = {
    list: peds,

    spawnNear: function (rng, x, y, count) {
      while (peds.length < MAX_PEDS && count > 0) {
        peds.push(makePed(rng, x, y));
        count--;
      }
    },

    reset: function (rng) {
      peds.length = 0;
      for (var i = 0; i < 16; i++) peds.push(makePed(rng));
    },

    // A gunshot or a near miss makes nearby pedestrians flee from the point.
    scare: function (x, y, radius) {
      peds.forEach(function (p) {
        if (p.state === 'down') return;
        if (PB.dist(p.x, p.y, x, y) < radius) {
          p.state = 'flee';
          var a = PB.angleTo(x, y, p.x, p.y);
          p.fleeX = p.x + Math.cos(a) * 320;
          p.fleeY = p.y + Math.sin(a) * 320;
        }
      });
    },

    // Knocked down by a car or a bullet. They stay down, then get up and run.
    knockDown: function (p) {
      if (p.state === 'down') return;
      p.state = 'down';
      p.downTimer = 2.5;
      PB.audio.thud();
    },

    update: function (dt, rng, player, cars) {
      // Keep the streets populated around the player.
      if (peds.length < 14) PB.pedestrians.spawnNear(rng, player.x, player.y, 2);

      for (var i = peds.length - 1; i >= 0; i--) {
        var p = peds[i];
        if (p.state === 'down') {
          p.downTimer -= dt;
          if (p.downTimer <= 0) {
            p.state = 'flee';
            var a = rng.range(0, Math.PI * 2);
            p.fleeX = p.x + Math.cos(a) * 300;
            p.fleeY = p.y + Math.sin(a) * 300;
          }
          continue;
        }

        var targetX, targetY, speed = p.speed;
        if (p.state === 'flee') {
          targetX = p.fleeX;
          targetY = p.fleeY;
          speed = p.speed * 2.6;
          if (PB.dist(p.x, p.y, targetX, targetY) < 24) p.state = 'walk';
        } else {
          targetX = p.tx;
          targetY = p.ty;
          if (PB.dist(p.x, p.y, targetX, targetY) < 20) {
            var next = randomSidewalkPoint(rng, p.x, p.y);
            p.tx = next.x;
            p.ty = next.y;
          }
        }

        var a = PB.angleTo(p.x, p.y, targetX, targetY);
        p.heading = a;
        var nx = p.x + Math.cos(a) * speed * dt;
        var ny = p.y + Math.sin(a) * speed * dt;
        // Pedestrians stay out of buildings; a blocked step waits a beat.
        if (!PB.city.solidAt(nx, ny, 8)) {
          p.x = nx;
          p.y = ny;
        } else {
          var next2 = randomSidewalkPoint(rng, p.x, p.y);
          p.tx = next2.x;
          p.ty = next2.y;
        }
        p.bob += dt * (p.state === 'flee' ? 14 : 8);

        // A fast car nearby makes them jump aside.
        cars.forEach(function (car) {
          if (Math.abs(car.speed) < 180) return;
          if (PB.dist(p.x, p.y, car.x, car.y) < 70) {
            p.state = 'flee';
            var fa = PB.angleTo(car.x, car.y, p.x, p.y);
            p.fleeX = p.x + Math.cos(fa) * 220;
            p.fleeY = p.y + Math.sin(fa) * 220;
          }
        });
      }
    }
  };
})();

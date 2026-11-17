// Palmera Bay — the player. On foot Rio walks, runs, punches and shoots; in a
// car he drives. Getting in and out is one key, and every crime it causes is
// reported to the wanted system the moment it happens.
(function () {
  var PB = window.PB = window.PB || {};

  var player = null;

  PB.player = {
    get state() { return player; },

    reset: function (x, y) {
      player = {
        x: x, y: y,
        heading: -Math.PI / 2,
        health: PB.PLAYER_HEALTH,
        cash: PB.START_CASH,
        inCar: null,        // the car object while driving, else null
        shootCooldown: 0,
        punchCooldown: 0,
        hurtCooldown: 0,
        walkBob: 0,
        moving: false
      };
      return player;
    },

    // Aim from the player toward the mouse, in world coordinates.
    aimAngle: function (cam) {
      var m = PB.input.mouse;
      var wx = cam.x + (m.x - PB.VIEW_W / 2) / cam.zoom;
      var wy = cam.y + (m.y - PB.VIEW_H / 2) / cam.zoom;
      return PB.angleTo(player.x, player.y, wx, wy);
    },

    hurt: function (amount) {
      if (player.hurtCooldown > 0 || player.health <= 0) return;
      player.health -= amount;
      player.hurtCooldown = 0.6;
      PB.audio.thud();
      if (player.health <= 0) {
        player.health = 0;
        PB.gameOver('wasted');
      }
    },

    update: function (dt, game) {
      if (!player || game.state !== 'playing') return;
      player.shootCooldown -= dt;
      player.punchCooldown -= dt;
      player.hurtCooldown -= dt;

      var input = PB.input;
      if (input.pressed('KeyM')) PB.audio.toggleMute();
      if (input.pressed('KeyE')) PB.player.tryEnterExitCar(game);

      if (player.inCar) {
        PB.player.updateDriving(dt, game);
        return;
      }
      PB.player.updateOnFoot(dt, game);
    },

    tryEnterExitCar: function (game) {
      if (player.inCar) {
        var car = player.inCar;
        player.inCar = null;
        // Step out beside the car, on the driver's side.
        var side = car.heading + Math.PI / 2;
        player.x = car.x + Math.cos(side) * 30;
        player.y = car.y + Math.sin(side) * 30;
        if (PB.city.solidAt(player.x, player.y, PB.PLAYER_RADIUS)) {
          player.x = car.x - Math.cos(side) * 30;
          player.y = car.y - Math.sin(side) * 30;
        }
        return;
      }
      var parked = PB.vehicles.nearestParked(player.x, player.y, 52);
      if (parked) {
        parked.kind = 'player';
        player.inCar = parked;
        player.x = parked.x;
        player.y = parked.y;
        game.onCrime('steal', 1);
        PB.gameMessage('Car stolen — the law noticed.');
      }
    },

    updateDriving: function (dt, game) {
      var car = player.inCar;
      var input = PB.input;
      var move = input.move();
      var throttle = 0;
      if (move.y < 0) throttle = 1;
      else if (move.y > 0) throttle = -1;
      var steer = 0;
      if (move.x < 0) steer = -1;
      else if (move.x > 0) steer = 1;
      PB.vehicles.drive(car, throttle, steer, dt);
      player.x = car.x;
      player.y = car.y;
      player.heading = car.heading;
      PB.audio.engine(Math.min(1, Math.abs(car.speed) / PB.CAR_TOP_SPEED), true);

      // Running a pedestrian over is a crime, and a loud one.
      PB.pedestrians.list.forEach(function (p) {
        if (p.state === 'down') return;
        if (PB.dist(p.x, p.y, car.x, car.y) < 30 && Math.abs(car.speed) > 60) {
          PB.pedestrians.knockDown(p);
          game.onCrime('hitPed', 1);
          PB.gameMessage('You hit a pedestrian!');
        }
      });
      if (car.wrecked) {
        player.inCar = null;
        player.x = car.x + 34;
        player.y = car.y;
        PB.gameMessage('Your car is wrecked.');
      }
    },

    updateOnFoot: function (dt, game) {
      var input = PB.input;
      var move = input.move();
      var speed = input.run() ? PB.RUN_SPEED : PB.WALK_SPEED;
      player.moving = (move.x !== 0 || move.y !== 0);
      if (player.moving) {
        var nx = player.x + move.x * speed * dt;
        var ny = player.y + move.y * speed * dt;
        if (!PB.city.solidAt(nx, player.y, PB.PLAYER_RADIUS)) player.x = nx;
        if (!PB.city.solidAt(player.x, ny, PB.PLAYER_RADIUS)) player.y = ny;
        player.heading = Math.atan2(move.y, move.x);
        player.walkBob += dt * 11;
      }
      player.x = PB.clamp(player.x, 16, PB.WORLD_W - 16);
      player.y = PB.clamp(player.y, 16, PB.WORLD_H - 16);
      PB.audio.engine(0, false);

      // Punch: Space swings at whatever is closest in front of Rio.
      if (input.pressed('Space') && player.punchCooldown <= 0) {
        player.punchCooldown = 0.45;
        PB.player.punch(game);
      }
      // Shoot: click fires the pistol toward the mouse.
      if (input.mouse.clicked && player.shootCooldown <= 0) {
        player.shootCooldown = 0.28;
        PB.player.shoot(game);
      }
    },

    punch: function (game) {
      var reach = 34;
      var px = player.x + Math.cos(player.heading) * reach;
      var py = player.y + Math.sin(player.heading) * reach;
      var hit = false;
      PB.pedestrians.list.forEach(function (p) {
        if (p.state !== 'down' && PB.dist(px, py, p.x, p.y) < 26) {
          PB.pedestrians.knockDown(p);
          game.onCrime('hitPed', 1);
          hit = true;
        }
      });
      PB.police.list.forEach(function (cop) {
        if (cop.onFoot && PB.dist(px, py, cop.x, cop.y) < 30) {
          cop.hp -= 34;
          hit = true;
          if (cop.hp <= 0) PB.police.dropCop(cop, game);
        }
      });
      if (hit) PB.audio.thud();
    },

    shoot: function (game) {
      var cam = game.camera;
      var angle = PB.player.aimAngle(cam);
      PB.audio.shot();
      game.addTracer(player.x, player.y, angle);
      game.onCrime('shoot', 1);
      PB.pedestrians.scare(player.x, player.y, 320);

      // Hitscan: the first person or car within 420px and 6 degrees of the aim.
      var best = null, bestD = 420;
      function consider(x, y, d) {
        var a = PB.angleTo(player.x, player.y, x, y);
        if (Math.abs(PB.angleDiff(angle, a)) < 0.12 && d < bestD) {
          bestD = d;
          best = { x: x, y: y };
        }
      }
      PB.pedestrians.list.forEach(function (p) {
        if (p.state !== 'down') consider(p.x, p.y, PB.dist(player.x, player.y, p.x, p.y));
      });
      PB.police.list.forEach(function (cop) {
        if (cop.onFoot) consider(cop.x, cop.y, PB.dist(player.x, player.y, cop.x, cop.y));
      });
      PB.vehicles.list.forEach(function (car) {
        if (car.kind === 'player') return;
        consider(car.x, car.y, PB.dist(player.x, player.y, car.x, car.y));
      });
      if (best) {
        game.addImpact(best.x, best.y);
        PB.pedestrians.list.forEach(function (p) {
          if (PB.dist(best.x, best.y, p.x, p.y) < 20 && p.state !== 'down') {
            PB.pedestrians.knockDown(p);
            game.onCrime('hitPed', 1);
          }
        });
        PB.police.list.forEach(function (cop) {
          if (cop.onFoot && PB.dist(best.x, best.y, cop.x, cop.y) < 22) {
            cop.hp -= 50;
            if (cop.hp <= 0) PB.police.dropCop(cop, game);
          }
        });
      }
    }
  };
})();

// Palmera Bay — boot, the frame loop and the game state. This file owns the
// camera, the particles, the message feed and the title/playing/busted/wasted
// states; the systems in the other files own their own updates.
(function () {
  var PB = window.PB = window.PB || {};

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var rng = PB.makeRng(PB.SHOT_SEED);

  var game = {
    state: 'title',           // title | playing | busted | wasted
    savedGame: null,
    camera: { x: 600, y: 600, zoom: 1 },
    particles: [],
    tracers: [],
    messages: [],
    nextMissionIn: -1,
    shotMode: false,
    shotFrames: 0,
    shot: null,
    time: 0
  };

  PB.game = game;

  PB.gameMessage = function (text) {
    game.messages.push({ text: text, at: performance.now() });
    if (game.messages.length > 4) game.messages.shift();
  };

  game.addParticle = function (x, y, vx, vy, life, color, size) {
    game.particles.push({ x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life, color: color, size: size });
  };

  game.addTracer = function (x, y, angle) {
    game.tracers.push({
      x1: x, y1: y,
      x2: x + Math.cos(angle) * 420,
      y2: y + Math.sin(angle) * 420,
      life: 0.09, maxLife: 0.09
    });
  };

  game.addImpact = function (x, y) {
    for (var i = 0; i < 8; i++) {
      game.addParticle(x, y,
        (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160,
        0.5, '#ffd94a', 3);
    }
  };

  game.queueNextMission = function (seconds) {
    game.nextMissionIn = seconds;
  };

  PB.gameOver = function (kind) {
    if (game.state !== 'playing') return;
    game.state = kind;
    PB.missions.fail(game);
    PB.audio.engine(0, false);
    PB.audio.siren(0, 0);
  };

  game.onCrime = function (kind, stars) {
    if (stars) PB.police.addWanted(stars);
  };

  function newGame() {
    rng = PB.makeRng(PB.SHOT_SEED);
    PB.city.generate(PB.SHOT_SEED);
    PB.player.reset(600, 600);
    PB.vehicles.reset(rng);
    PB.pedestrians.reset(rng);
    PB.police.reset();
    var saved = game.savedGame;
    PB.missions.reset(0, []);
    game.messages.length = 0;
    game.particles.length = 0;
    game.tracers.length = 0;
    game.nextMissionIn = -1;
    game.state = 'playing';
    game.camera.x = 600;
    game.camera.y = 600;
    PB.gameMessage('Rio Casta is back in Palmera Bay. Sal is waiting.');
    PB.missions.startNext(game);
  }

  function continueGame() {
    var saved = game.savedGame;
    rng = PB.makeRng(PB.SHOT_SEED);
    PB.city.generate(PB.SHOT_SEED);
    var player = PB.player.reset(600, 600);
    player.cash = saved.cash;
    PB.vehicles.reset(rng);
    PB.pedestrians.reset(rng);
    PB.police.reset();
    PB.missions.reset(saved.missionIndex, saved.completed);
    game.messages.length = 0;
    game.state = 'playing';
    game.camera.x = 600;
    game.camera.y = 600;
    PB.gameMessage('Welcome back, Rio. Cash $' + saved.cash + '.');
    PB.missions.startNext(game);
  }

  function update(dt) {
    var player = PB.player.state;
    if (!player) return;

    if (game.state === 'playing') {
      PB.player.update(dt, game);
      PB.vehicles.update(dt, rng, player.x, player.y);
      PB.pedestrians.update(dt, rng, player, PB.vehicles.list);
      PB.police.update(dt, game, rng);
      PB.missions.update(dt, game);
      if (game.nextMissionIn > 0) {
        game.nextMissionIn -= dt;
        if (game.nextMissionIn <= 0) PB.missions.startNext(game);
      }
    }

    // Particles and tracers age out on every state.
    for (var i = game.particles.length - 1; i >= 0; i--) {
      var p = game.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) game.particles.splice(i, 1);
    }
    for (var j = game.tracers.length - 1; j >= 0; j--) {
      game.tracers[j].life -= dt;
      if (game.tracers[j].life <= 0) game.tracers.splice(j, 1);
    }

    // Camera: follow Rio, ease toward him, pull back a touch at speed.
    var targetZoom = 1;
    if (player.inCar) targetZoom = 0.88;
    game.camera.zoom += (targetZoom - game.camera.zoom) * Math.min(1, 2 * dt);
    game.camera.x += (player.x - game.camera.x) * Math.min(1, 4 * dt);
    game.camera.y += (player.y - game.camera.y) * Math.min(1, 4 * dt);
    game.camera.x = PB.clamp(game.camera.x, 300, PB.WORLD_W - 300);
    game.camera.y = PB.clamp(game.camera.y, 240, PB.WORLD_H - 240);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(0, 0, PB.VIEW_W, PB.VIEW_H);
    var cam = game.camera;
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom,
      PB.VIEW_W / 2 - cam.x * cam.zoom,
      PB.VIEW_H / 2 - cam.y * cam.zoom);
    PB.render.drawWorld(ctx, game, cam);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    PB.hud.draw(ctx, game);
    if (PB.player.state && PB.player.state.health <= 25 && game.state === 'playing') {
      ctx.fillStyle = 'rgba(210, 59, 46, 0.12)';
      ctx.fillRect(0, 0, PB.VIEW_W, PB.VIEW_H);
    }
  }

  var last = performance.now();
  var held = false;   // in shot mode the loop stops once the frame is staged
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.time += dt;

    if (game.state === 'title') {
      if (PB.input.pressed('Enter')) {
        PB.audio.unlock();
        if (game.savedGame) continueGame();
        else newGame();
      } else if (PB.input.pressed('KeyN')) {
        PB.audio.unlock();
        PB.save.clear();
        game.savedGame = null;
        newGame();
      }
      // Slow drift over the city behind the menu.
      game.camera.x = 1200 + Math.sin(game.time * 0.05) * 500;
      game.camera.y = 700 + Math.cos(game.time * 0.04) * 250;
    } else if (game.state === 'busted' || game.state === 'wasted') {
      if (PB.input.pressed('KeyR')) newGame();
      else if (PB.input.pressed('KeyT')) {
        game.state = 'title';
        game.savedGame = PB.save.load();
      }
    } else {
      update(dt);
    }

    render();
    PB.input.endFrame();

    if (game.shotMode) {
      // Hold the staged frame for the screenshot instead of looping forever.
      if (PB.shots.step(game, dt)) {
        held = true;
        return;
      }
    }
    if (!held) requestAnimationFrame(frame);
  }

  function boot() {
    PB.bindCanvas(canvas);
    PB.city.generate(PB.SHOT_SEED);
    PB.player.reset(600, 600);
    PB.vehicles.reset(rng);
    PB.pedestrians.reset(rng);
    PB.police.reset();
    PB.missions.reset(0, []);
    game.savedGame = PB.save.load();

    var shot = PB.shots.parse();
    if (shot) {
      PB.shots.stage(game, shot);
      game.shot = shot;
    }
    document.getElementById('fallback').style.display = 'none';
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

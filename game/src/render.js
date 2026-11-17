// Palmera Bay — rendering. One canvas, one camera, everything drawn in world
// order: ground, roads, park and beach, buildings, markers, cars, people, Rio,
// then particles and tracers. The HUD lives in hud.js and draws after this.
(function () {
  var PB = window.PB = window.PB || {};

  function drawCarShape(ctx, car, isPlayer) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(-car.length / 2 + 3, -car.width / 2 + 4, car.length, car.width);
    // Body.
    ctx.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
    ctx.beginPath();
    ctx.roundRect(-car.length / 2, -car.width / 2, car.length, car.width, 7);
    ctx.fill();
    // Cabin + windshield.
    ctx.fillStyle = car.wrecked ? '#222' : 'rgba(20, 30, 46, 0.85)';
    ctx.beginPath();
    ctx.roundRect(-6, -car.width / 2 + 4, 18, car.width - 8, 4);
    ctx.fill();
    // Headlights and taillights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(car.length / 2 - 3, -car.width / 2 + 2, 3, 5);
    ctx.fillRect(car.length / 2 - 3, car.width / 2 - 7, 3, 5);
    ctx.fillStyle = '#d23b2e';
    ctx.fillRect(-car.length / 2, -car.width / 2 + 2, 3, 5);
    ctx.fillRect(-car.length / 2, car.width / 2 - 7, 3, 5);
    if (car.kind === 'police') {
      // Light bar, alternating red and blue by the clock.
      var phase = Math.floor(performance.now() / 280) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2d2d' : '#2d5bff';
      ctx.fillRect(-4, -car.width / 2 + 1, 8, 6);
      ctx.fillStyle = phase ? '#2d5bff' : '#ff2d2d';
      ctx.fillRect(-4, car.width / 2 - 7, 8, 6);
      ctx.fillStyle = '#f2ead8';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', 8, 3);
    }
    if (isPlayer) {
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-car.length / 2 - 3, -car.width / 2 - 3, car.length + 6, car.width + 6, 9);
      ctx.stroke();
    }
    ctx.restore();
    // Smoke from a wreck.
    if (car.wrecked && Math.random() < 0.3) {
      PB.game.addParticle(car.x - 10, car.y - 6, -8, -26, 1.4, 'rgba(60,60,60,0.5)', 9);
    }
  }

  function drawPersonShape(ctx, x, y, heading, color, skin, bob, down) {
    ctx.save();
    ctx.translate(x, y);
    if (down) {
      ctx.rotate(heading + Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(15, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    var swing = Math.sin(bob) * 3;
    ctx.rotate(heading);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs, swinging as they walk.
    ctx.strokeStyle = '#2c3242';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6 + swing, 7);
    ctx.moveTo(0, 0);
    ctx.lineTo(-6 - swing, 7);
    ctx.stroke();
    // Body.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-6, -9, 12, 15, 5);
    ctx.fill();
    // Head.
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(2, -13, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPalm(ctx, palm) {
    ctx.save();
    ctx.translate(palm.x, palm.y);
    ctx.strokeStyle = PB.PALETTE.palmTrunk;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(palm.lean * 20, -14, palm.lean * 26, -26);
    ctx.stroke();
    ctx.fillStyle = PB.PALETTE.palmLeaf;
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2 + palm.lean;
      ctx.beginPath();
      ctx.ellipse(
        palm.lean * 26 + Math.cos(a) * 13,
        -26 + Math.sin(a) * 9,
        13, 4.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  PB.render = {
    drawCar: drawCarShape,
    drawPerson: drawPersonShape,

    drawWorld: function (ctx, game, cam) {
      var W = PB.WORLD_W, H = PB.WORLD_H;
      // Ground.
      ctx.fillStyle = PB.PALETTE.grass;
      ctx.fillRect(0, 0, W, PB.BEACH_Y);
      // Mown stripes, purely for texture.
      ctx.fillStyle = PB.PALETTE.grassDark;
      for (var gy = 0; gy < PB.BEACH_Y; gy += 120) {
        ctx.fillRect(0, gy, W, 60);
      }
      // Beach and water.
      ctx.fillStyle = PB.PALETTE.sand;
      ctx.fillRect(0, PB.BEACH_Y, W, PB.WATER_Y - PB.BEACH_Y);
      ctx.fillStyle = PB.PALETTE.water;
      ctx.fillRect(0, PB.WATER_Y, W, H - PB.WATER_Y);
      ctx.fillStyle = PB.PALETTE.waterDeep;
      for (var wx = 0; wx < W; wx += 180) {
        ctx.fillRect(wx, PB.WATER_Y + 46, 90, 5);
        ctx.fillRect(wx + 60, PB.WATER_Y + 110, 110, 5);
      }
      // Park.
      var park = PB.city.park;
      if (park) {
        ctx.fillStyle = PB.PALETTE.park;
        ctx.fillRect(park.x - 8, park.y - 8, park.w + 16, park.h + 16);
      }

      // Roads: asphalt, kerbs, centre dashes.
      ctx.fillStyle = PB.PALETTE.road;
      PB.city.roadYs.forEach(function (y) {
        if (y < PB.BEACH_Y) ctx.fillRect(0, y - PB.ROAD_W / 2, W, PB.ROAD_W);
      });
      PB.city.roadXs.forEach(function (x) {
        ctx.fillRect(x - PB.ROAD_W / 2, 0, PB.ROAD_W, PB.BEACH_Y);
      });
      // Beach road along the sand.
      ctx.fillRect(0, PB.BEACH_Y - PB.ROAD_W - 10, W, PB.ROAD_W);
      ctx.fillStyle = PB.PALETTE.sidewalk;
      PB.city.roadYs.forEach(function (y) {
        if (y < PB.BEACH_Y) {
          ctx.fillRect(0, y - PB.ROAD_W / 2 - PB.SIDEWALK, W, PB.SIDEWALK);
          ctx.fillRect(0, y + PB.ROAD_W / 2, W, PB.SIDEWALK);
        }
      });
      PB.city.roadXs.forEach(function (x) {
        ctx.fillRect(x - PB.ROAD_W / 2 - PB.SIDEWALK, 0, PB.SIDEWALK, PB.BEACH_Y);
        ctx.fillRect(x + PB.ROAD_W / 2, 0, PB.SIDEWALK, PB.BEACH_Y);
      });
      // Centre dashes.
      ctx.fillStyle = PB.PALETTE.roadLine;
      PB.city.roadYs.forEach(function (y) {
        if (y >= PB.BEACH_Y) return;
        for (var dx = 0; dx < W; dx += 64) ctx.fillRect(dx + 8, y - 2, 34, 4);
      });
      PB.city.roadXs.forEach(function (x) {
        for (var dy = 0; dy < PB.BEACH_Y; dy += 64) ctx.fillRect(x - 2, dy + 8, 4, 34);
      });

      // Pier and lighthouse.
      var pier = PB.city.pier, light = PB.city.lighthouse, garage = PB.city.garage;
      if (pier) {
        ctx.fillStyle = '#8a6a45';
        ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
        ctx.fillStyle = '#6e5336';
        for (var px = pier.x + 8; px < pier.x + pier.w; px += 22) {
          ctx.fillRect(px, pier.y, 3, pier.h);
        }
      }
      if (garage) {
        ctx.fillStyle = '#c65a3a';
        ctx.fillRect(garage.x, garage.y, garage.w, garage.h);
        ctx.fillStyle = '#f2ead8';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SAL\u2019S GARAGE', garage.x + garage.w / 2, garage.y + garage.h / 2 + 4);
      }
      if (light) {
        ctx.fillStyle = '#f2ead8';
        ctx.fillRect(light.x + 24, light.y, 22, light.h);
        ctx.fillStyle = '#d23b2e';
        ctx.fillRect(light.x + 24, light.y, 22, 14);
        ctx.fillRect(light.x + 24, light.y + 30, 22, 12);
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(light.x + 35, light.y - 6, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Buildings with roof detail and a soft shadow.
      PB.city.buildings.forEach(function (b) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
        ctx.fillStyle = b.wall;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = b.roof;
        ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 5);
        // Windows on the wall edge.
        ctx.fillStyle = 'rgba(30,42,64,0.8)';
        var cols = Math.max(1, Math.floor((b.w - 16) / 22));
        for (var i = 0; i < cols; i++) {
          ctx.fillRect(b.x + 8 + i * 22, b.y + b.h - 12, 10, 7);
        }
      });
      PB.city.palms.forEach(function (palm) { drawPalm(ctx, palm); });
      // Park label last, so the palms never cover it.
      if (park) {
        ctx.fillStyle = '#e8d44f';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MARINA PARK', park.x + park.w / 2, park.y + park.h / 2);
      }

      // Mission beacon: a pulsing column over the current objective.
      var marker = PB.missions.currentMarker();
      if (marker) {
        var pulse = 0.5 + 0.5 * Math.sin(performance.now() / 240);
        ctx.fillStyle = 'rgba(255, 217, 74, ' + (0.25 + pulse * 0.25) + ')';
        ctx.beginPath();
        ctx.ellipse(marker.x, marker.y, 34, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd94a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, 22 + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd94a';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', marker.x, marker.y - 26);
      }

      // Parked, traffic and police cars, then pedestrians, then Rio.
      PB.vehicles.list.forEach(function (car) {
        var isPlayer = PB.player.state && PB.player.state.inCar === car;
        drawCarShape(ctx, car, isPlayer);
      });
      PB.pedestrians.list.forEach(function (p) {
        drawPersonShape(ctx, p.x, p.y, p.heading, p.color, p.skin, p.bob, p.state === 'down');
      });
      PB.police.list.forEach(function (cop) {
        if (cop.onFoot) {
          drawPersonShape(ctx, cop.x, cop.y, PB.angleTo(cop.x, cop.y, PB.player.state.x, PB.player.state.y),
            '#1d4fd7', '#e8b98a', performance.now() / 120, false);
        }
      });
      var player = PB.player.state;
      if (player && !player.inCar) {
        drawPersonShape(ctx, player.x, player.y, player.heading, '#e8452c', '#e8b98a', player.walkBob, false);
      }

      // Particles and tracers.
      game.particles.forEach(function (pt) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      game.tracers.forEach(function (t) {
        ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
        ctx.strokeStyle = '#ffe9a8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  };
})();

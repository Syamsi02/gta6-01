// Palmera Bay — the HUD, the minimap, the message feed and every screen that
// is not the world itself: title, busted, wasted, and the pause overlay. All of
// it is drawn on the same canvas, so screenshots show the game as played.
(function () {
  var PB = window.PB = window.PB || {};

  var MINIMAP_W = 208, MINIMAP_H = 150;

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = PB.PALETTE.hudPanel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
  }

  function drawStars(ctx, x, y, wanted) {
    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < PB.WANTED_MAX; i++) {
      ctx.fillStyle = i < wanted ? PB.PALETTE.star : PB.PALETTE.starEmpty;
      ctx.fillText('\u2605', x + i * 26, y);
    }
  }

  function drawMinimap(ctx, game) {
    var mx = PB.VIEW_W - MINIMAP_W - 16;
    var my = PB.VIEW_H - MINIMAP_H - 16;
    panel(ctx, mx - 6, my - 6, MINIMAP_W + 12, MINIMAP_H + 12);
    var sx = MINIMAP_W / PB.WORLD_W;
    var sy = MINIMAP_H / PB.WORLD_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.clip();
    ctx.fillStyle = '#5d8a48';
    ctx.fillRect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = '#2f9db4';
    ctx.fillRect(mx, my + PB.WATER_Y * sy, MINIMAP_W, MINIMAP_H - PB.WATER_Y * sy);
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(mx, my + PB.BEACH_Y * sy, MINIMAP_W, (PB.WATER_Y - PB.BEACH_Y) * sy);
    ctx.fillStyle = '#3a3f4a';
    PB.city.roadXs.forEach(function (x) { ctx.fillRect(mx + x * sx - 2, my, 4, PB.BEACH_Y * sy); });
    PB.city.roadYs.forEach(function (y) { ctx.fillRect(mx, my + y * sy - 2, MINIMAP_W, 4); });
    var marker = PB.missions.currentMarker();
    if (marker) {
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.arc(mx + marker.x * sx, my + marker.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    PB.police.list.forEach(function (cop) {
      ctx.fillStyle = '#2d5bff';
      ctx.beginPath();
      ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    var player = PB.player.state;
    if (player) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx + player.x * sx, my + player.y * sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8452c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = PB.PALETTE.hudText;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PALMERA BAY', mx, my - 12);
  }

  PB.hud = {
    draw: function (ctx, game) {
      var player = PB.player.state;
      var state = game.state;
      if (state === 'title') { PB.hud.drawTitle(ctx, game); return; }
      if (state === 'busted' || state === 'wasted') { PB.hud.drawEnd(ctx, game); return; }
      if (!player) return;

      // Top-left: cash and the current objective.
      panel(ctx, 14, 14, 330, 66);
      ctx.fillStyle = PB.PALETTE.hudAccent;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('$' + player.cash, 28, 42);
      ctx.fillStyle = PB.PALETTE.hudText;
      ctx.font = '13px system-ui, sans-serif';
      var objective = PB.missions.currentObjective();
      ctx.fillText(objective || 'Free roam — find Sal for work (jobs pay cash).', 28, 64, 300);

      // Top-right: wanted stars and health.
      panel(ctx, PB.VIEW_W - 240, 14, 226, 66);
      drawStars(ctx, PB.VIEW_W - 224, 42, PB.police.wanted);
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(PB.VIEW_W - 224, 52, 150, 10);
      ctx.fillStyle = player.health > 30 ? '#7fb069' : '#d23b2e';
      ctx.fillRect(PB.VIEW_W - 224, 52, 150 * (player.health / PB.PLAYER_HEALTH), 10);
      ctx.fillStyle = PB.PALETTE.hudText;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('HP', PB.VIEW_W - 66, 61);

      // Bottom-left: controls.
      panel(ctx, 14, PB.VIEW_H - 74, 300, 60);
      ctx.fillStyle = PB.PALETTE.hudText;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(player.inCar ? 'W/S drive   A/D steer   E get out   M mute' : 'WASD move   Shift run   E steal car   Space punch   Click shoot   M mute', 26, PB.VIEW_H - 50, 280);
      ctx.fillText(player.inCar ? 'Speed: ' + Math.round(Math.abs(player.inCar.speed) * 0.12) + ' km/h' : 'On foot — find a parked car and press E.', 26, PB.VIEW_H - 30);

      // Message feed, newest last, fading with age.
      var now = performance.now();
      game.messages.forEach(function (m, i) {
        var age = (now - m.at) / 1000;
        if (age > 7) return;
        ctx.globalAlpha = Math.max(0, 1 - (age - 4) / 3);
        ctx.fillStyle = PB.PALETTE.hudText;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.text, PB.VIEW_W / 2, 116 + i * 24);
      });
      ctx.globalAlpha = 1;

      drawMinimap(ctx, game);
    },

    drawTitle: function (ctx, game) {
      // The city behind the title keeps rendering; dim it and lay out the menu.
      ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
      ctx.fillRect(0, 0, PB.VIEW_W, PB.VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 84px system-ui, sans-serif';
      ctx.fillText(PB.TITLE, PB.VIEW_W / 2, 240);
      ctx.fillStyle = PB.PALETTE.hudText;
      ctx.font = 'italic 22px system-ui, sans-serif';
      ctx.fillText(PB.SUBTITLE, PB.VIEW_W / 2, 282);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Rio Casta owes Sal Marlow $5,000. Three jobs. One city. No brakes.', PB.VIEW_W / 2, 330);
      var saved = game.savedGame;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(saved ? 'ENTER — Continue ($' + saved.cash + ', job ' + (saved.missionIndex + 1) + ' of 3)    N — New game' : 'ENTER — Start the story', PB.VIEW_W / 2, 420);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = PB.PALETTE.hudText;
      ctx.fillText('WASD move   Shift run   E steal / exit car   Space punch   Click shoot   M mute', PB.VIEW_W / 2, 500);
      ctx.fillText('Steal cars, dodge the law, finish Sal\u2019s jobs. Progress saves automatically.', PB.VIEW_W / 2, 528);
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#9aa3b2';
      ctx.fillText('An original game. No real city, person or car from any commercial game appears here.', PB.VIEW_W / 2, 580);
    },

    drawEnd: function (ctx, game) {
      ctx.fillStyle = 'rgba(8, 12, 24, 0.62)';
      ctx.fillRect(0, 0, PB.VIEW_W, PB.VIEW_H);
      ctx.textAlign = 'center';
      var title = game.state === 'busted' ? 'BUSTED' : 'WASTED';
      ctx.fillStyle = game.state === 'busted' ? '#2d5bff' : '#d23b2e';
      ctx.font = 'bold 76px system-ui, sans-serif';
      ctx.fillText(title, PB.VIEW_W / 2, 330);
      ctx.fillStyle = PB.PALETTE.hudText;
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(game.state === 'busted'
        ? 'The Palmera Bay PD caught up with Rio. Sal will bail him out — for a price.'
        : 'Rio went down in the streets of Palmera Bay. The city does not wait.',
        PB.VIEW_W / 2, 380);
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('R — Try again    T — Title screen', PB.VIEW_W / 2, 450);
    }
  };
})();

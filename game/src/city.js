// Palmera Bay — the city itself. One seeded generator lays out streets, blocks,
// buildings, a park, the beach and the pier, and answers every collision query
// the rest of the game asks: what is solid here, is this point on a road.
(function () {
  var PB = window.PB = window.PB || {};

  var buildings = [];
  var palms = [];
  var park = null;      // one green block, {x, y, w, h}
  var garage = null;    // Sal's garage, where mission 1 ends
  var pier = null;      // the pier, where mission 3 begins
  var lighthouse = null;// the lighthouse, where mission 3 ends
  var roadXs = [];
  var roadYs = [];

  function roadCentres(limit) {
    var list = [];
    for (var v = PB.ROAD_SPACING / 2; v < limit; v += PB.ROAD_SPACING) list.push(v);
    return list;
  }

  PB.city = {
    buildings: buildings,
    palms: palms,
    get park() { return park; },
    get garage() { return garage; },
    get pier() { return pier; },
    get lighthouse() { return lighthouse; },
    roadXs: roadXs,
    roadYs: roadYs,

    // Build the whole city from a seed. Called once at boot, and again only
    // when the player picks a different seed from the title screen.
    generate: function (seed) {
      var rng = PB.makeRng(seed);
      buildings.length = 0;
      palms.length = 0;
      roadXs.length = 0;
      roadYs.length = 0;

      var xs = roadCentres(PB.WORLD_W);
      var ys = roadCentres(PB.BEACH_Y);
      xs.forEach(function (x) { roadXs.push(x); });
      ys.forEach(function (y) { roadYs.push(y); });

      // Blocks sit between neighbouring streets; each holds 1-3 buildings.
      for (var bi = 0; bi < xs.length - 1; bi++) {
        for (var bj = 0; bj < ys.length - 1; bj++) {
          var bx = xs[bi] + PB.ROAD_W / 2 + PB.SIDEWALK;
          var by = ys[bj] + PB.ROAD_W / 2 + PB.SIDEWALK;
          var bw = PB.ROAD_SPACING - PB.ROAD_W - PB.SIDEWALK * 2;
          var bh = PB.ROAD_SPACING - PB.ROAD_W - PB.SIDEWALK * 2;

          // The middle block is the city park: grass, palms, no buildings.
          if (bi === 4 && bj === 3) {
            park = { x: bx, y: by, w: bw, h: bh };
            for (var p = 0; p < 14; p++) {
              palms.push({
                x: bx + rng.range(16, bw - 16),
                y: by + rng.range(16, bh - 16),
                lean: rng.range(-0.25, 0.25)
              });
            }
            continue;
          }

          var count = rng.int(1, 3);
          for (var k = 0; k < count; k++) {
            var w = rng.range(52, 92);
            var h = rng.range(52, 92);
            var x = bx + rng.range(6, Math.max(7, bw - w - 6));
            var y = by + rng.range(6, Math.max(7, bh - h - 6));
            buildings.push({
              x: x, y: y, w: w, h: h,
              roof: rng.pick(PB.PALETTE.buildingRoof),
              wall: rng.pick(PB.PALETTE.buildingWall),
              floors: rng.int(1, 4),
              seed: rng.int(0, 99999)
            });
          }

          // Street palms along the block's south kerb, now and then.
          if (rng.chance(0.55)) {
            palms.push({
              x: bx + rng.range(20, bw - 20),
              y: by + bh + PB.SIDEWALK / 2,
              lean: rng.range(-0.2, 0.2)
            });
          }
        }
      }

      // Landmarks on the beach road: garage west, pier mid, lighthouse east.
      garage = { x: 150, y: PB.BEACH_Y - 190, w: 110, h: 80 };
      pier = { x: 1120, y: PB.BEACH_Y - 40, w: 180, h: 30 };
      lighthouse = { x: 2180, y: PB.BEACH_Y - 260, w: 70, h: 70 };
    },

    // True when the circle at (x, y) with radius r overlaps a solid building
    // or a landmark wall. Roads, sand and water are never solid here.
    solidAt: function (x, y, r) {
      for (var i = 0; i < buildings.length; i++) {
        var b = buildings[i];
        if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
      }
      if (garage && x + r > garage.x && x - r < garage.x + garage.w &&
          y + r > garage.y && y - r < garage.y + garage.h) return garage;
      if (lighthouse && x + r > lighthouse.x && x - r < lighthouse.x + lighthouse.w &&
          y + r > lighthouse.y && y - r < lighthouse.y + lighthouse.h) return lighthouse;
      return null;
    },

    // Push a circle out of whatever solid rect it overlaps. Returns true when
    // anything pushed, so callers can kill speed or play a thud.
    resolveCircle: function (body) {
      var b = PB.city.solidAt(body.x, body.y, body.r);
      if (!b) return false;
      var cx = PB.clamp(body.x, b.x, b.x + b.w);
      var cy = PB.clamp(body.y, b.y, b.y + b.h);
      var dx = body.x - cx, dy = body.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) { body.y = b.y - body.r - 0.5; return true; }
      var push = (body.r - d) / d;
      body.x += dx * push;
      body.y += dy * push;
      return true;
    },

    // True when the point is on a road surface (not sidewalk, not a block).
    onRoad: function (x, y) {
      var half = PB.ROAD_W / 2;
      for (var i = 0; i < roadXs.length; i++) {
        if (Math.abs(x - roadXs[i]) < half) return true;
      }
      for (var j = 0; j < roadYs.length; j++) {
        if (Math.abs(y - roadYs[j]) < half) return true;
      }
      return false;
    },

    // Nearest point on any road centreline, for spawning traffic and police.
    nearestRoadPoint: function (x, y) {
      var best = null, bestD = Infinity;
      roadXs.forEach(function (rx) {
        var d = Math.abs(x - rx);
        if (d < bestD) { bestD = d; best = { x: rx, y: y, axis: 'v' }; }
      });
      roadYs.forEach(function (ry) {
        var d = Math.abs(y - ry);
        if (d < bestD) { bestD = d; best = { x: x, y: ry, axis: 'h' }; }
      });
      return best;
    },

    inBeach: function (y) { return y >= PB.BEACH_Y; },
    inWater: function (y) { return y >= PB.WATER_Y; }
  };
})();

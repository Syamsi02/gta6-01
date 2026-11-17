// Palmera Bay — the story. Three jobs from Sal Marlow, the fixer who owns the
// garage on the beach road. Each mission is a small chain of objectives with a
// marker on the map and in the world; finishing one pays cash and unlocks the
// next. Fail by getting busted or wasted, and the job is offered again.
(function () {
  var PB = window.PB = window.PB || {};

  var missions = null;
  var active = null;      // the running mission instance, or null in free roam
  var missionIndex = 0;
  var completedMissions = [];

  function markerAt(place) {
    return { x: place.x + place.w / 2, y: place.y + place.h / 2 };
  }

  function buildMissions() {
    var g = PB.city.garage, pier = PB.city.pier, light = PB.city.lighthouse;
    return [
      {
        id: 'first-wheels',
        title: 'First Wheels',
        giver: 'Sal Marlow',
        brief: 'Sal needs wheels, fast. Steal any car and bring it to my garage on the beach road.',
        steps: [
          { id: 'steal', text: 'Steal a car (walk up to a parked car, press E)', kind: 'stealCar' },
          { id: 'deliver', text: 'Deliver the car to Sal\u2019s garage', kind: 'reach', at: markerAt(g), radius: 90 }
        ]
      },
      {
        id: 'hot-wheels',
        title: 'Hot Wheels',
        giver: 'Sal Marlow',
        brief: 'The cops are sniffing around my garage. Get them riled up to 2 stars, then lose them. Survive 40 seconds without getting caught.',
        steps: [
          { id: 'heat', text: 'Raise your wanted level to 2 stars (steal, hit, shoot)', kind: 'wanted', stars: 2 },
          { id: 'evade', text: 'Lose the cops — stay out of sight for 40 seconds', kind: 'evade', seconds: 40 }
        ]
      },
      {
        id: 'the-drop',
        title: 'The Drop',
        giver: 'Sal Marlow',
        brief: 'A package is waiting on the pier. Grab it, then run it to the lighthouse. The cops will be all over you — don\u2019t get caught.',
        steps: [
          { id: 'pickup', text: 'Pick up the package on the pier', kind: 'reach', at: markerAt(pier), radius: 60 },
          { id: 'deliver', text: 'Deliver the package to the lighthouse', kind: 'reach', at: markerAt(light), radius: 80 }
        ]
      }
    ];
  }

  PB.missions = {
    get active() { return active; },
    get missionIndex() { return missionIndex; },
    get completed() { return completedMissions; },
    get all() { return missions; },

    reset: function (savedIndex, savedCompleted) {
      missions = buildMissions();
      missionIndex = savedIndex || 0;
      completedMissions = savedCompleted || [];
      active = null;
    },

    // The objective the HUD shows right now, or null in free roam.
    currentObjective: function () {
      if (!active) return null;
      var step = active.steps[active.step];
      return step ? step.text : null;
    },

    // The world position the minimap and the beacon should point at.
    currentMarker: function () {
      if (!active) return null;
      var step = active.steps[active.step];
      if (!step) return null;
      if (step.kind === 'reach') return step.at;
      if (step.kind === 'stealCar') {
        var parked = PB.vehicles.list.find(function (c) { return c.kind === 'parked'; });
        return parked ? { x: parked.x, y: parked.y } : null;
      }
      return null;
    },

    startNext: function (game) {
      if (missionIndex >= missions.length) {
        PB.gameMessage('Story complete — Palmera Bay is yours. Free roam!');
        return;
      }
      var def = missions[missionIndex];
      active = {
        def: def,
        steps: def.steps,
        step: 0,
        timer: 0,
        carrying: false
      };
      PB.gameMessage('New job from ' + def.giver + ': ' + def.title);
      PB.gameMessage(def.brief);
      PB.audio.chime();
    },

    // Called every frame while a mission runs. Advances steps, pays out, fails.
    update: function (dt, game) {
      if (!active) return;
      var player = PB.player.state;
      var step = active.steps[active.step];
      if (!step) return;

      if (step.kind === 'stealCar') {
        if (player.inCar) PB.missions.advance(game);
      } else if (step.kind === 'reach') {
        if (PB.dist(player.x, player.y, step.at.x, step.at.y) < step.radius) {
          if (active.def.id === 'the-drop' && step.id === 'pickup') {
            active.carrying = true;
            PB.audio.pickup();
            PB.gameMessage('Package secured. Now run it to the lighthouse!');
            PB.police.addWanted(3);
          }
          PB.missions.advance(game);
        }
      } else if (step.kind === 'wanted') {
        if (PB.police.wanted >= step.stars) PB.missions.advance(game);
      } else if (step.kind === 'evade') {
        if (PB.police.wanted === 0) {
          active.timer += dt;
          if (active.timer >= step.seconds) PB.missions.advance(game);
        } else {
          active.timer = 0;
        }
      }
    },

    advance: function (game) {
      active.step += 1;
      PB.audio.chime();
      if (active.step >= active.steps.length) {
        var reward = PB.MISSION_REWARDS[missionIndex] || 500;
        var player = PB.player.state;
        player.cash += reward;
        completedMissions.push(active.def.id);
        PB.gameMessage('Job done: ' + active.def.title + ' — paid $' + reward + '.');
        missionIndex += 1;
        active = null;
        PB.save.store({
          cash: player.cash,
          missionIndex: missionIndex,
          completedMissions: completedMissions
        });
        // The next job arrives after a breath.
        game.queueNextMission(3);
      } else {
        PB.gameMessage('Objective updated: ' + active.steps[active.step].text);
      }
    },

    // Busted or wasted mid-job: the job is offered again from its first step.
    fail: function (game) {
      if (!active) return;
      PB.gameMessage('Job failed: ' + active.def.title + '. Sal will give you another shot.');
      active = null;
      game.queueNextMission(4);
    }
  };
})();

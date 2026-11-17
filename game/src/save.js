// Palmera Bay — saving. Cash and story progress persist in localStorage, so a
// player can quit after a mission and keep going later. Every access is guarded:
// private windows and headless runs may refuse storage, and the game must not die.
(function () {
  var PB = window.PB = window.PB || {};

  var KEY = 'palmera-bay-save-v1';

  PB.save = {
    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (typeof data !== 'object' || data === null) return null;
        return {
          cash: typeof data.cash === 'number' ? data.cash : PB.START_CASH,
          missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
          completed: Array.isArray(data.completed) ? data.completed : []
        };
      } catch (e) {
        return null;
      }
    },
    store: function (state) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify({
          cash: state.cash,
          missionIndex: state.missionIndex,
          completed: state.completedMissions
        }));
        return true;
      } catch (e) {
        return false;
      }
    },
    clear: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* storage refused */ }
    }
  };
})();

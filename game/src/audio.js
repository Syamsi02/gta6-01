// Palmera Bay — sound, synthesised live with WebAudio. No audio files ship
// with the game; every effect is an oscillator or a burst of noise, so the
// game stays silent on disk and still sounds alive in the browser.
(function () {
  var PB = window.PB = window.PB || {};

  var ctx = null;
  var engineOsc = null;
  var engineGain = null;
  var sirenOsc = null;
  var sirenGain = null;
  var sirenTimer = 0;
  var muted = false;

  function ensureContext() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      return true;
    } catch (e) {
      return false;
    }
  }

  function noiseBuffer(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  PB.audio = {
    // Call from the first key press or click: browsers unlock audio on gesture.
    unlock: function () {
      if (!ensureContext()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    toggleMute: function () {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    isMuted: function () { return muted; },

    // Continuous engine hum. Call every frame with speed 0..1 while driving.
    engine: function (speed01, driving) {
      if (!ensureContext() || muted || !driving) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(ctx.destination);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speed01 * 130;
      engineGain.gain.value = 0.028 + speed01 * 0.035;
    },

    // Two-tone police siren while the player is wanted. Call every frame.
    siren: function (wanted, dt) {
      if (!ensureContext() || muted || wanted < 1) {
        if (sirenGain) sirenGain.gain.value = 0;
        return;
      }
      if (!sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(ctx.destination);
        sirenOsc.start();
      }
      sirenTimer += dt;
      var high = Math.floor(sirenTimer * 2) % 2 === 0;
      sirenOsc.frequency.value = high ? 920 : 620;
      sirenGain.gain.value = 0.02;
    },

    shot: function () {
      if (!ensureContext() || muted) return;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.12);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    },
    thud: function () {
      if (!ensureContext() || muted) return;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    },
    chime: function () {
      if (!ensureContext() || muted) return;
      [660, 880].forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        var gain = ctx.createGain();
        var t = ctx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    },
    pickup: function () {
      if (!ensureContext() || muted) return;
      var osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(780, ctx.currentTime + 0.08);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    }
  };
})();

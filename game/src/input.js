// Palmera Bay — keyboard and mouse. The game reads this one object; nothing
// else touches the DOM events, so rebinding a key is a one-line change here.
(function () {
  var PB = window.PB = window.PB || {};

  var keys = {};
  var pressed = {};   // keys pressed since the last frame was consumed
  var mouse = { x: 0, y: 0, down: false, clicked: false };
  var anyKey = false;

  function codeOf(e) { return e.code || e.key; }

  window.addEventListener('keydown', function (e) {
    var c = codeOf(e);
    if (!keys[c]) pressed[c] = true;
    keys[c] = true;
    anyKey = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(c) >= 0) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) { keys[codeOf(e)] = false; });
  window.addEventListener('blur', function () {
    keys = {};
    mouse.down = false;
  });

  var canvas = null;
  PB.bindCanvas = function (c) {
    canvas = c;
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (c.width / r.width);
      mouse.y = (e.clientY - r.top) * (c.height / r.height);
    });
    c.addEventListener('mousedown', function (e) {
      mouse.down = true;
      mouse.clicked = true;
      anyKey = true;
      if (e.button === 0) e.preventDefault();
    });
    window.addEventListener('mouseup', function () { mouse.down = false; });
  };

  PB.input = {
    down: function (c) { return !!keys[c]; },
    pressed: function (c) { return !!pressed[c]; },
    // WASD or arrows, as a unit vector. Zero when nothing is held.
    move: function () {
      var x = 0, y = 0;
      if (keys.KeyA || keys.ArrowLeft) x -= 1;
      if (keys.KeyD || keys.ArrowRight) x += 1;
      if (keys.KeyW || keys.ArrowUp) y -= 1;
      if (keys.KeyS || keys.ArrowDown) y += 1;
      if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
      return { x: x, y: y };
    },
    run: function () { return !!(keys.ShiftLeft || keys.ShiftRight); },
    mouse: mouse,
    // True once after any key press or click; the title screen consumes it.
    anyKeyPressed: function () { return anyKey; },
    // Call at the end of each frame so pressed/anyKey do not leak into the next.
    endFrame: function () {
      pressed = {};
      mouse.clicked = false;
      anyKey = false;
    }
  };
})();

function init() {
  var canvasSize = 150;
  var xCenter = canvasSize / 2;
  var yCenter = canvasSize / 2;
  var stage = new createjs.Stage('joystick');

  var psp = new createjs.Shape();
  psp.graphics.beginFill('#333333').drawCircle(xCenter, yCenter, 25); // radius halved for smaller canvas
  psp.alpha = 0.25;

  var vertical = new createjs.Shape();
  var horizontal = new createjs.Shape();
  vertical.graphics.beginFill('#ff4d4d').drawRect(xCenter, 0, 2, canvasSize);
  horizontal.graphics.beginFill('#ff4d4d').drawRect(0, yCenter, canvasSize, 2);

  stage.addChild(psp);
  stage.addChild(vertical);
  stage.addChild(horizontal);
  createjs.Ticker.framerate = 60;
  createjs.Ticker.addEventListener('tick', stage);
  stage.update();

  var myElement = document.getElementById('joystick');

  // create a simple instance
  var mc = new Hammer(myElement);

  mc.on("panstart", function(ev) {
    xCenter = psp.x || canvasSize / 2;
    yCenter = psp.y || canvasSize / 2;
    psp.alpha = 0.5;
    stage.update();
  });

  mc.on("panmove", function(ev) {
    var rect = myElement.getBoundingClientRect();
    var x = (ev.center.x - rect.left - canvasSize / 2);
    var y = (ev.center.y - rect.top - canvasSize / 2);

    var coords = calculateCoords(ev.angle, ev.distance, canvasSize);

    psp.x = coords.x;
    psp.y = coords.y;
    psp.alpha = 0.5;
    stage.update();
  });

  mc.on("panend", function(ev) {
    psp.alpha = 0.25;
    createjs.Tween.get(psp).to({x:canvasSize/2, y:canvasSize/2},750,createjs.Ease.elasticOut);
  });
}

function calculateCoords(angle, distance, canvasSize) {
  var coords = {};
  var maxDistance = (canvasSize / 2) - 25; // keep inside the joystick area
  distance = Math.min(distance, maxDistance);
  var rads = (angle * Math.PI) / 180.0;

  coords.x = (canvasSize / 2) + distance * Math.cos(rads);
  coords.y = (canvasSize / 2) + distance * Math.sin(rads);

  return coords;
}

(function() {
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  const baseRect = () => base.getBoundingClientRect();
  let dragging = false;
  let center = { x: 50, y: 50 };
  let maxDist = 40; // px

  function setKnob(x, y) {
    knob.style.left = (x - 20) + 'px';
    knob.style.top = (y - 20) + 'px';
  }

  function handleMove(clientX, clientY) {
    const rect = baseRect();
    const dx = clientX - (rect.left + rect.width/2);
    const dy = clientY - (rect.top + rect.height/2);
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), maxDist);
    const angle = Math.atan2(dy, dx);
    const x = 50 + dist * Math.cos(angle);
    const y = 50 + dist * Math.sin(angle);
    setKnob(x, y);

    // Expose normalized values (-1 to 1) for your game
    window.joystick = {
      x: +(dist ? Math.cos(angle) * dist / maxDist : 0).toFixed(2),
      y: +(dist ? Math.sin(angle) * dist / maxDist : 0).toFixed(2)
    };
  }

  function resetKnob() {
    setKnob(50, 50);
    window.joystick = { x: 0, y: 0 };
  }

  base.addEventListener('pointerdown', function(e) {
    dragging = true;
    handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', function(e) {
    if (dragging) handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('pointerup', function() {
    if (dragging) {
      dragging = false;
      resetKnob();
    }
  });

  // Initialize
  resetKnob();
})();
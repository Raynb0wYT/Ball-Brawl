var ballsEaten = 0;
var ballsEatenHistory = [];
var bepsHistory = [];
var ballsEatenTimestamps = [];
var blueBallColor = "#0077b3";
var redBallColor = "#ff0000";
var blueBalls = [];
var redBalls = [];
var peakBEPS = 0;

// Power-up state variables
let powerUpActive = false;
let powerUpEndTime = 0;
let nextPowerUpTime = Date.now() + 5000;
let powerUpBall = null;
let greenPowerUpActive = false;
let greenPowerUpEndTime = 0;
let greenPowerUpBall = null;
let storedBlueBalls = [];
let purplePowerUpBall = null, purplePowerUpActive = false, purplePowerUpEndTime = 0;
let orangePowerUpBall = null, orangePowerUpActive = false, orangePowerUpEndTime = 0, storedRedVelocities = [];
let pinkPowerUpBall = null, pinkPowerUpActive = false, pinkPowerUpEndTime = 0;
let whitePowerUpBall = null;
let originalRedRadius = 5, shrunkRedRadius = 2.5;
let originalRedSpeed = 3.5;

// Ball properties
var ballRadius = 10;
var speed = 2;
var normalSpeed = speed;
var fastSpeed = speed * 2.5;
var redRadius = 5;

document.addEventListener("DOMContentLoaded", function() {
    var c = document.getElementById("ballPlayground");
    var ctx = c.getContext("2d");

    // Hide color customizers initially
    document.getElementById("colorCustomizer").style.display = "none";
    document.getElementById("redColorCustomizer").style.display = "none";

    // Initialize balls
    function initBalls() {
        blueBalls = [{
            x: Math.random() * (c.width - 2 * ballRadius) + ballRadius,
            y: Math.random() * (c.height - 2 * ballRadius) + ballRadius,
            vx: 0,
            vy: 0,
            trail: [],
            lastEatenTime: Date.now(),
            color: blueBallColor
        }];
        redBalls = [];
        for (let i = 0; i < 5; i++) {
            redBalls.push(spawnRedBall());
        }
    }
    initBalls();

    function spawnRedBall() {
        let angle = Math.random() * 2 * Math.PI;
        let redSpeed = 3.5;
        if (purplePowerUpActive) redRadius = shrunkRedRadius;
        else redRadius = originalRedRadius;
        if (pinkPowerUpActive) redSpeed *= 0.5;
        let dx = Math.cos(angle) * redSpeed;
        let dy = Math.sin(angle) * redSpeed;
        if (orangePowerUpActive) { dx = 0; dy = 0; }
        return {
            x: Math.random() * (c.width - 2 * redRadius) + redRadius,
            y: Math.random() * (c.height - 2 * redRadius) + redRadius,
            dx: dx,
            dy: dy,
            trail: []
        };
    }

    function moveTowards(ball, target) {
        let dx = target.x - ball.x;
        let dy = target.y - ball.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const ease = 0.08;
            let desiredVx = (dx / dist) * speed;
            let desiredVy = (dy / dist) * speed;
            ball.vx = ball.vx * (1 - ease) + desiredVx * ease;
            ball.vy = ball.vy * (1 - ease) + desiredVy * ease;
            ball.x += ball.vx;
            ball.y += ball.vy;
        }
    }

    function updateRedBalls() {
        for (let red of redBalls) {
            red.x += red.dx;
            red.y += red.dy;
            if (red.x <= redRadius || red.x >= c.width - redRadius) {
                red.dx *= -1;
                red.x = Math.max(redRadius, Math.min(red.x, c.width - redRadius));
            }
            if (red.y <= redRadius || red.y >= c.height - redRadius) {
                red.dy *= -1;
                red.y = Math.max(redRadius, Math.min(red.y, c.height - redRadius));
            }
            if (!red.trail) red.trail = [];
            red.trail.push({x: red.x, y: red.y});
            if (red.trail.length > 30) red.trail.shift();
        }
    }

    function drawBlueBalls() {
        for (let ball of blueBalls) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color || blueBallColor;
            ctx.fill();
            ctx.closePath();
        }
    }

    function drawRedBalls() {
        for (let red of redBalls) {
            ctx.beginPath();
            ctx.arc(red.x, red.y, redRadius, 0, Math.PI * 2);
            ctx.fillStyle = redBallColor;
            ctx.fill();
            ctx.closePath();
        }
    }

    function checkCollision() {
        for (let b = 0; b < blueBalls.length; b++) {
            let ball = blueBalls[b];
            for (let i = 0; i < redBalls.length; i++) {
                let red = redBalls[i];
                let dist = Math.sqrt((ball.x - red.x) ** 2 + (ball.y - red.y) ** 2);
                if (dist < ballRadius + redRadius) {
                    redBalls[i] = spawnRedBall();
                    ballsEaten++;
                    ballsEatenTimestamps.push(Date.now());
                    ballsEatenHistory.push(ballsEaten);
                    document.getElementById("ballsEaten").innerText = "Balls Eaten: " + ballsEaten;
                    // Show color customizers only after 100 balls eaten
                    if (ballsEaten === 100) {
                        document.getElementById("colorCustomizer").style.display = "inline-block";
                        document.getElementById("redColorCustomizer").style.display = "inline-block";
                    }
                    if (ballsEaten >= 1000) {
                        document.getElementById("redColorCustomizer").style.display = "inline-block";
                    }
                    ball.lastEatenTime = Date.now();
                    if (ballsEaten % 10 === 0 && blueBalls.length < 5) {
                        blueBalls.push({
                            x: Math.random() * (c.width - 2 * ballRadius) + ballRadius,
                            y: Math.random() * (c.height - 2 * ballRadius) + ballRadius,
                            vx: 0,
                            vy: 0,
                            trail: [],
                            lastEatenTime: Date.now(),
                            color: blueBallColor
                        });
                        let toAdd = Math.min(5, 30 - redBalls.length);
                        for (let j = 0; j < toAdd; j++) {
                            redBalls.push(spawnRedBall());
                        }
                    }
                }
            }
        }
        // Power-up collisions (see below for each power-up)
    }

    function drawBlueBallTrails() {
        for (let ball of blueBalls) {
            const rgb = ball.color === "limegreen"
                ? { r: 50, g: 205, b: 50 }
                : hexToRgb(ball.color || blueBallColor);
            if (!ball.trail) continue;
            for (let t = 0; t < ball.trail.length; t++) {
                let pos = ball.trail[t];
                let alpha = t / ball.trail.length;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, ballRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.7})`;
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    function drawRedBallTrails() {
        const rgb = hexToRgb(redBallColor);
        for (let red of redBalls) {
            if (!red.trail) continue;
            for (let t = 0; t < red.trail.length; t++) {
                let pos = red.trail[t];
                let alpha = t / red.trail.length;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, redRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.5})`;
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    function drawBallsEatenGraph() {
        const graphCanvas = document.getElementById("ballsEatenGraph");
        if (!graphCanvas) return;
        const gctx = graphCanvas.getContext("2d");
        const graphWidth = graphCanvas.width;
        const graphHeight = graphCanvas.height;
        let minBEPS = 0;
        let maxBEPS = Math.max(1, ...bepsHistory);
        gctx.clearRect(0, 0, graphWidth, graphHeight);
        gctx.save();
        gctx.globalAlpha = 0.7;
        gctx.fillStyle = "#fff";
        gctx.fillRect(0, 0, graphWidth, graphHeight);
        gctx.globalAlpha = 1.0;
        gctx.beginPath();
        for (let i = 0; i < bepsHistory.length; i++) {
            let x = graphWidth - 1 - i;
            let value = bepsHistory[bepsHistory.length - 1 - i];
            let y = graphHeight - ((value - minBEPS) / (maxBEPS - minBEPS)) * graphHeight;
            if (i === 0) {
                gctx.moveTo(x, y);
            } else {
                gctx.lineTo(x, y);
            }
        }
        gctx.strokeStyle = "#0077b3";
        gctx.lineWidth = 2;
        gctx.stroke();
        gctx.strokeStyle = "#888";
        gctx.lineWidth = 1;
        gctx.strokeRect(0, 0, graphWidth, graphHeight);
        gctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, c.width, c.height);
        updateRedBalls();

        // Power-up spawn logic (randomly pick one, only one at a time)
        const now = Date.now();
        if (
            !powerUpActive && !greenPowerUpActive &&
            !powerUpBall && !greenPowerUpBall &&
            !purplePowerUpBall && !orangePowerUpBall && !pinkPowerUpBall && !whitePowerUpBall &&
            now > nextPowerUpTime
        ) {
            const powerupTypes = ["yellow", "green", "purple", "orange", "pink", "white"];
            let type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            let angle = Math.random() * 2 * Math.PI;
            let powerUpSpeed = 7;
            if (type === "yellow") {
                powerUpBall = {
                    x: Math.random() * (c.width - 30) + 15,
                    y: Math.random() * (c.height - 30) + 15,
                    dx: Math.cos(angle) * powerUpSpeed,
                    dy: Math.sin(angle) * powerUpSpeed,
                    radius: 12
                };
            } else if (type === "green") {
                greenPowerUpBall = {
                    x: Math.random() * (c.width - 30) + 15,
                    y: Math.random() * (c.height - 30) + 15,
                    dx: Math.cos(angle) * powerUpSpeed,
                    dy: Math.sin(angle) * powerUpSpeed,
                    radius: 12
                };
            } else if (type === "purple") {
                purplePowerUpBall = {
                    x: Math.random() * (c.width - 30) + 15,
                    y: Math.random() * (c.height - 30) + 15,
                    dx: Math.cos(angle) * powerUpSpeed,
                    dy: Math.sin(angle) * powerUpSpeed,
                    radius: 12
                };
            } else if (type === "orange") {
                orangePowerUpBall = {
                    x: Math.random() * (c.width - 30) + 15,
                    y: Math.random() * (c.height - 30) + 15,
                    dx: Math.cos(angle) * powerUpSpeed,
                    dy: Math.sin(angle) * powerUpSpeed,
                    radius: 12
                };
            } else if (type === "pink") {
                pinkPowerUpBall = {
                    x: Math.random() * (c.width - 30) + 15,
                    y: Math.random() * (c.height - 30) + 15,
                    dx: Math.cos(angle) * powerUpSpeed,
                    dy: Math.sin(angle) * powerUpSpeed,
                    radius: 12
                };
            } else if (type === "white") {
                whitePowerUpBall = {
                    x: Math.random() * (c.width - 30) + 15,
                    y: Math.random() * (c.height - 30) + 15,
                    dx: Math.cos(angle) * powerUpSpeed,
                    dy: Math.sin(angle) * powerUpSpeed,
                    radius: 12
                };
            }
        }

        // Power-up movement, drawing, collision, and effect logic
        // (Insert the big block from previous answers here for all power-ups...)

        // Blue ball AI targeting (closest red or power-up)
        let targetedRedBalls = new Set();
        for (let ball of blueBalls) {
            let minDist = Infinity;
            let closestRed = null;
            let closestIndex = -1;
            for (let i = 0; i < redBalls.length + (powerUpBall ? 1 : 0) + (greenPowerUpBall ? 1 : 0); i++) {
                let red;
                if (i < redBalls.length) {
                    if (targetedRedBalls.has(i)) continue;
                    red = redBalls[i];
                } else if (i === redBalls.length && powerUpBall) {
                    red = powerUpBall;
                } else if (i === redBalls.length + (powerUpBall ? 1 : 0) && greenPowerUpBall) {
                    red = greenPowerUpBall;
                } else {
                    continue;
                }
                let dist = Math.sqrt((ball.x - red.x) ** 2 + (ball.y - red.y) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    closestRed = red;
                    closestIndex = i;
                }
            }
            if (closestRed) {
                targetedRedBalls.add(closestIndex);
                moveTowards(ball, closestRed);
            }
            if (!ball.trail) ball.trail = [];
            ball.trail.push({x: ball.x, y: ball.y});
            if (ball.trail.length > 40) ball.trail.shift();
        }

        drawRedBallTrails();
        drawRedBalls();
        drawBlueBallTrails();
        drawBlueBalls();
        checkCollision();

        // BEPS calculation
        while (ballsEatenTimestamps.length && ballsEatenTimestamps[0] < now - 1000) {
            ballsEatenTimestamps.shift();
        }
        const graphCanvas = document.getElementById("ballsEatenGraph");
        const maxPoints = graphCanvas.width;
        bepsHistory.push(ballsEatenTimestamps.length);
        if (bepsHistory.length > maxPoints) bepsHistory.shift();

        // Update BEPS and Peak BEPS counters
        let currentBEPS = ballsEatenTimestamps.length;
        if (currentBEPS > peakBEPS) peakBEPS = currentBEPS;
        document.getElementById("currentBEPS").innerText = currentBEPS;
        document.getElementById("peakBEPS").innerText = peakBEPS;

        drawBallsEatenGraph();

        // Power-up status
        let powerupText = "None";
        if (powerUpActive) {
            powerupText = "Speed (Yellow)";
        } else if (greenPowerUpActive) {
            powerupText = "Double Blue Balls (Green)";
        }
        document.getElementById("activePowerup").innerText = powerupText;
    }

    setInterval(draw, 10);

    var picker = document.getElementById("ballColorPicker");
    if (picker) {
        picker.addEventListener("input", function() {
            blueBallColor = picker.value;
            for (let ball of blueBalls) {
                if (ball.color !== "limegreen") {
                    ball.color = blueBallColor;
                }
            }
        });
    }
    var redPicker = document.getElementById("redBallColorPicker");
    if (redPicker) {
        redPicker.addEventListener("input", function() {
            redBallColor = redPicker.value;
        });
    }
});

function hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        hex = hex.split("").map(x => x + x).join("");
    }
    let num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}
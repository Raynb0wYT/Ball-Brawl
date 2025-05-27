document.addEventListener("DOMContentLoaded", function() {

    let gameStarted = false;
    let animationId;

    // --- Canvas and context ---
    var c = document.getElementById("ballPlayground");
    var ctx = c.getContext("2d");

    // --- Game state ---
    var ballsEaten = 0;
    var ballsEatenHistory = [];
    var bepsHistory = [];
    var ballsEatenTimestamps = [];
    var blueBallColor = "#0077b3";
    var redBallColor = "#ff0000";
    var peakBEPS = 0;

    // --- Ball properties ---
    var ballRadius = 10;
    var speed = 2.5; // Player speed
    var normalSpeed = speed;
    var fastSpeed = speed * 2.5;
    var redRadius = 5;
    var originalRedRadius = 5, shrunkRedRadius = 2.5;
    var originalRedSpeed = 3.5;

    // --- Balls ---
    var blueBalls = [{
        x: c.width / 2,
        y: c.height / 2,
        vx: 0,
        vy: 0,
        trail: [],
        lastEatenTime: Date.now(),
        color: blueBallColor
    }];
    var redBalls = [];
    // --- Power-up state ---
    let powerUpActive = false;
    let powerUpEndTime = 0;
    let nextPowerUpTime = Date.now() + 5000;
    let powerUpBall = null;
    let purplePowerUpBall = null, purplePowerUpActive = false, purplePowerUpEndTime = 0;
    let orangePowerUpBall = null, orangePowerUpActive = false, orangePowerUpEndTime = 0, storedRedVelocities = [];
    let pinkPowerUpBall = null, pinkPowerUpActive = false, pinkPowerUpEndTime = 0;
    let whitePowerUpBall = null;
    let touchTarget = null;
    let isTouching = false;
    for (let i = 0; i < 5; i++) {
        redBalls.push(spawnRedBall());
    }

    // --- Player control ---
    let keys = {};
    document.addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; });
    document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

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

    function movePlayer(ball) {
        let moveX = 0, moveY = 0;

        // Joystick control (overrides touch/mouse/keyboard if active)
        if (window.joystick && (window.joystick.x !== 0 || window.joystick.y !== 0)) {
            moveX = window.joystick.x;
            moveY = window.joystick.y;
        } else if (isTouching && touchTarget) {
            // Touch or mouse hover control
            let dx = touchTarget.x - ball.x;
            let dy = touchTarget.y - ball.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 1) {
                moveX = dx / dist;
                moveY = dy / dist;
            }
        } else {
            // Keyboard control (desktop)
            if (keys["arrowup"] || keys["w"]) moveY -= 1;
            if (keys["arrowdown"] || keys["s"]) moveY += 1;
            if (keys["arrowleft"] || keys["a"]) moveX -= 1;
            if (keys["arrowright"] || keys["d"]) moveX += 1;
            let len = Math.hypot(moveX, moveY);
            if (len > 0) {
                moveX /= len;
                moveY /= len;
            }
        }

        // Move at fixed speed
        ball.x += moveX * speed;
        ball.y += moveY * speed;

        // Keep inside bounds
        ball.x = Math.max(ballRadius, Math.min(ball.x, c.width - ballRadius));
        ball.y = Math.max(ballRadius, Math.min(ball.y, c.height - ballRadius));
    }

    function updatePlayerPosition() {
        if (window.joystick) {
            player.x += window.joystick.x * speed;
            player.y += window.joystick.y * speed;
        }
        // Clamp player position to stay inside the canvas if needed
        player.x = Math.max(player.radius, Math.min(c.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(c.height - player.radius, player.y));
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
        let ball = blueBalls[0];
        for (let i = 0; i < redBalls.length; i++) {
            let red = redBalls[i];
            let dist = Math.sqrt((ball.x - red.x) ** 2 + (ball.y - red.y) ** 2);
            if (dist < ballRadius + redRadius) {
                redBalls[i] = spawnRedBall();
                ballsEaten++;
                ballsEatenTimestamps.push(Date.now());
                ballsEatenHistory.push(ballsEaten);
                document.getElementById("ballsEaten").innerText = "Balls Eaten: " + ballsEaten;
                if (ballsEaten >= 100) {
                    document.getElementById("colorCustomizer").style.display = "inline-block";
                }
                if (ballsEaten >= 1000) {
                    document.getElementById("redColorCustomizer").style.display = "inline-block";
                }
                ball.lastEatenTime = Date.now();
                timeLeft = timeLimit; // Reset timer on eating a ball

                // Prevent more than 5 red balls
                while (redBalls.length > 5) {
                    redBalls.pop();
                }
            }
        }

        // --- Power-up collisions ---
        // Yellow (magnet)
        if (powerUpBall && !powerUpActive) {
            let dx = ball.x - powerUpBall.x;
            let dy = ball.y - powerUpBall.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballRadius + powerUpBall.radius) {
                powerUpActive = true;
                powerUpEndTime = Date.now() + 5000;
                powerUpBall = null;
                nextPowerUpTime = Date.now() + 15000;
            }
        }
        // Purple (shrink reds)
        if (purplePowerUpBall && !purplePowerUpActive) {
            let dx = ball.x - purplePowerUpBall.x;
            let dy = ball.y - purplePowerUpBall.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballRadius + purplePowerUpBall.radius) {
                purplePowerUpActive = true;
                purplePowerUpEndTime = Date.now() + 8000;
                redRadius = shrunkRedRadius;
                purplePowerUpBall = null;
                nextPowerUpTime = Date.now() + 15000;
            }
        }
        // Orange (freeze reds)
        if (orangePowerUpBall && !orangePowerUpActive) {
            let dx = ball.x - orangePowerUpBall.x;
            let dy = ball.y - orangePowerUpBall.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballRadius + orangePowerUpBall.radius) {
                orangePowerUpActive = true;
                orangePowerUpEndTime = Date.now() + 6000;
                storedRedVelocities = redBalls.map(r => ({dx: r.dx, dy: r.dy}));
                for (let r of redBalls) { r.dx = 0; r.dy = 0; }
                orangePowerUpBall = null;
                nextPowerUpTime = Date.now() + 15000;
            }
        }
        // Pink (slow reds)
        if (pinkPowerUpBall && !pinkPowerUpActive) {
            let dx = ball.x - pinkPowerUpBall.x;
            let dy = ball.y - pinkPowerUpBall.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballRadius + pinkPowerUpBall.radius) {
                pinkPowerUpActive = true;
                pinkPowerUpEndTime = Date.now() + 8000;
                for (let r of redBalls) {
                    r.dx *= 0.5;
                    r.dy *= 0.5;
                }
                pinkPowerUpBall = null;
                nextPowerUpTime = Date.now() + 15000;
            }
        }
        // White (eat all reds)
        if (whitePowerUpBall) {
            let dx = ball.x - whitePowerUpBall.x;
            let dy = ball.y - whitePowerUpBall.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballRadius + whitePowerUpBall.radius) {
                for (let i = 0; i < redBalls.length; i++) {
                    redBalls[i] = spawnRedBall();
                    ballsEaten++;
                    ballsEatenTimestamps.push(Date.now());
                    ballsEatenHistory.push(ballsEaten);
                }
                document.getElementById("ballsEaten").innerText = "Balls Eaten: " + ballsEaten;
                whitePowerUpBall = null;
                nextPowerUpTime = Date.now() + 15000;
                timeLeft = timeLimit; // <-- Reset timer to 5 seconds
            }
        }

        // Magnet effect: consume nearby red balls
        if (powerUpActive) {
            let magnetRadius = ballRadius + 60;
            for (let i = redBalls.length - 1; i >= 0; i--) {
                let red = redBalls[i];
                let dist = Math.sqrt((blueBalls[0].x - red.x) ** 2 + (blueBalls[0].y - red.y) ** 2);
                if (dist < magnetRadius) {
                    redBalls[i] = spawnRedBall();
                    ballsEaten++;
                    ballsEatenTimestamps.push(Date.now());
                    ballsEatenHistory.push(ballsEaten);
                    document.getElementById("ballsEaten").innerText = "Balls Eaten: " + ballsEaten;
                    if (ballsEaten >= 100) {
                        document.getElementById("colorCustomizer").style.display = "inline-block";
                    }
                    if (ballsEaten >= 1000) {
                        document.getElementById("redColorCustomizer").style.display = "inline-block";
                    }
                    blueBalls[0].lastEatenTime = Date.now();
                    timeLeft = timeLimit; // <-- Reset timer on magnet eat

                    // Prevent more than 5 red balls
                    while (redBalls.length > 5) {
                        redBalls.pop();
                    }
                }
            }
        }
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

    let timeLimit = 5000; // 5 seconds in ms
    let timeLeft = timeLimit;
    let lastFrameTime = Date.now();
    let gameOver = false;
    let survivalStartTime = Date.now();

    async function endGame() {
        gameOver = true;
        joystickDirection = { x: 0, y: 0 };
        const overlay = document.getElementById("gameOverOverlay");
        if (overlay) overlay.style.display = "block";
        const survivedTime = ((Date.now() - survivalStartTime) / 1000).toFixed(1);
        const survivedTimeElem = document.getElementById("survivedTime");
        if (survivedTimeElem) survivedTimeElem.textContent = "You survived: " + survivedTime + " seconds";
        if (overlay) overlay.style.display = "flex";
        const joystickZone = document.getElementById("joystick-zone");
        if (joystickZone) joystickZone.style.display = "none";
        document.body.style.overflow = "hidden";

        // Save score and show leaderboard (await both!)
        await window.saveOrUpdateScore(survivedTime, ballsEaten);
        await window.showLeaderboardFromFirestore();
    }

    async function draw() {
        if (!gameStarted || gameOver) return;

        ctx.clearRect(0, 0, c.width, c.height);

        movePlayer(blueBalls[0]);
        updateRedBalls();

        // Add to trail for player
        let ball = blueBalls[0];
        if (!ball.trail) ball.trail = [];
        ball.trail.push({x: ball.x, y: ball.y});
        if (ball.trail.length > 40) ball.trail.shift();

        // --- Power-up spawn logic ---
        const now = Date.now(); // Declare once here
        if (
            !powerUpActive &&
            !powerUpBall &&
            !purplePowerUpBall && !orangePowerUpBall && !pinkPowerUpBall && !whitePowerUpBall &&
            now > nextPowerUpTime
        ) {
            const powerupTypes = ["yellow", "purple", "orange", "pink", "white"];
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

        // --- Power-up movement, drawing, and effect logic ---
        // Yellow
        if (powerUpBall) {
            ctx.beginPath();
            ctx.arc(powerUpBall.x, powerUpBall.y, powerUpBall.radius, 0, Math.PI * 2);
            ctx.fillStyle = "yellow";
            ctx.shadowColor = "gold";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();
            powerUpBall.x += powerUpBall.dx;
            powerUpBall.y += powerUpBall.dy;
            if (powerUpBall.x <= powerUpBall.radius || powerUpBall.x >= c.width - powerUpBall.radius) {
                powerUpBall.dx *= -1;
                powerUpBall.x = Math.max(powerUpBall.radius, Math.min(powerUpBall.x, c.width - powerUpBall.radius));
            }
            if (powerUpBall.y <= powerUpBall.radius || powerUpBall.y >= c.height - powerUpBall.radius) {
                powerUpBall.dy *= -1;
                powerUpBall.y = Math.max(powerUpBall.radius, Math.min(powerUpBall.y, c.height - powerUpBall.radius));
            }
        }
        if (powerUpActive && now > powerUpEndTime) {
            powerUpActive = false;
            speed = normalSpeed;
            nextPowerUpTime = now + 15000;
        }

        // Purple
        if (purplePowerUpBall) {
            ctx.beginPath();
            ctx.arc(purplePowerUpBall.x, purplePowerUpBall.y, purplePowerUpBall.radius, 0, Math.PI * 2);
            ctx.fillStyle = "purple";
            ctx.shadowColor = "violet";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();
            purplePowerUpBall.x += purplePowerUpBall.dx;
            purplePowerUpBall.y += purplePowerUpBall.dy;
            if (purplePowerUpBall.x <= purplePowerUpBall.radius || purplePowerUpBall.x >= c.width - purplePowerUpBall.radius) {
                purplePowerUpBall.dx *= -1;
                purplePowerUpBall.x = Math.max(purplePowerUpBall.radius, Math.min(purplePowerUpBall.x, c.width - purplePowerUpBall.radius));
            }
            if (purplePowerUpBall.y <= purplePowerUpBall.radius || purplePowerUpBall.y >= c.height - purplePowerUpBall.radius) {
                purplePowerUpBall.dy *= -1;
                purplePowerUpBall.y = Math.max(purplePowerUpBall.radius, Math.min(purplePowerUpBall.y, c.height - purplePowerUpBall.radius));
            }
        }
        if (purplePowerUpActive && now > purplePowerUpEndTime) {
            purplePowerUpActive = false;
            redRadius = originalRedRadius;
            nextPowerUpTime = now + 15000;
        }

        // Orange
        if (orangePowerUpBall) {
            ctx.beginPath();
            ctx.arc(orangePowerUpBall.x, orangePowerUpBall.y, orangePowerUpBall.radius, 0, Math.PI * 2);
            ctx.fillStyle = "orange";
            ctx.shadowColor = "goldenrod";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();
            orangePowerUpBall.x += orangePowerUpBall.dx;
            orangePowerUpBall.y += orangePowerUpBall.dy;
            if (orangePowerUpBall.x <= orangePowerUpBall.radius || orangePowerUpBall.x >= c.width - orangePowerUpBall.radius) {
                orangePowerUpBall.dx *= -1;
                orangePowerUpBall.x = Math.max(orangePowerUpBall.radius, Math.min(orangePowerUpBall.x, c.width - orangePowerUpBall.radius));
            }
            if (orangePowerUpBall.y <= orangePowerUpBall.radius || orangePowerUpBall.y >= c.height - orangePowerUpBall.radius) {
                orangePowerUpBall.dy *= -1;
                orangePowerUpBall.y = Math.max(orangePowerUpBall.radius, Math.min(orangePowerUpBall.y, c.height - orangePowerUpBall.radius));
            }
        }
        if (orangePowerUpActive && now > orangePowerUpEndTime) {
            orangePowerUpActive = false;
            for (let i = 0; i < redBalls.length; i++) {
                if (storedRedVelocities[i]) {
                    redBalls[i].dx = storedRedVelocities[i].dx;
                    redBalls[i].dy = storedRedVelocities[i].dy;
                } else {
                    let angle = Math.random() * 2 * Math.PI;
                    redBalls[i].dx = Math.cos(angle) * originalRedSpeed;
                    redBalls[i].dy = Math.sin(angle) * originalRedSpeed;
                }
            }
            nextPowerUpTime = now + 15000;
        }

        // Pink
        if (pinkPowerUpBall) {
            ctx.beginPath();
            ctx.arc(pinkPowerUpBall.x, pinkPowerUpBall.y, pinkPowerUpBall.radius, 0, Math.PI * 2);
            ctx.fillStyle = "pink";
            ctx.shadowColor = "hotpink";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();
            pinkPowerUpBall.x += pinkPowerUpBall.dx;
            pinkPowerUpBall.y += pinkPowerUpBall.dy;
            if (pinkPowerUpBall.x <= pinkPowerUpBall.radius || pinkPowerUpBall.x >= c.width - pinkPowerUpBall.radius) {
                pinkPowerUpBall.dx *= -1;
                pinkPowerUpBall.x = Math.max(pinkPowerUpBall.radius, Math.min(pinkPowerUpBall.x, c.width - pinkPowerUpBall.radius));
            }
            if (pinkPowerUpBall.y <= pinkPowerUpBall.radius || pinkPowerUpBall.y >= c.height - pinkPowerUpBall.radius) {
                pinkPowerUpBall.dy *= -1;
                pinkPowerUpBall.y = Math.max(pinkPowerUpBall.radius, Math.min(pinkPowerUpBall.y, c.height - pinkPowerUpBall.radius));
            }
        }
        if (pinkPowerUpActive && now > pinkPowerUpEndTime) {
            pinkPowerUpActive = false;
            for (let r of redBalls) {
                let angle = Math.atan2(r.dy, r.dx);
                r.dx = Math.cos(angle) * originalRedSpeed;
                r.dy = Math.sin(angle) * originalRedSpeed;
            }
            nextPowerUpTime = now + 15000;
        }

        // White
        if (whitePowerUpBall) {
            ctx.beginPath();
            ctx.arc(whitePowerUpBall.x, whitePowerUpBall.y, whitePowerUpBall.radius, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.shadowColor = "gray";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();
            whitePowerUpBall.x += whitePowerUpBall.dx;
            whitePowerUpBall.y += whitePowerUpBall.dy;
            if (whitePowerUpBall.x <= whitePowerUpBall.radius || whitePowerUpBall.x >= c.width - whitePowerUpBall.radius) {
                whitePowerUpBall.dx *= -1;
                whitePowerUpBall.x = Math.max(whitePowerUpBall.radius, Math.min(whitePowerUpBall.x, c.width - whitePowerUpBall.radius));
            }
            if (whitePowerUpBall.y <= whitePowerUpBall.radius || whitePowerUpBall.y >= c.height - whitePowerUpBall.radius) {
                whitePowerUpBall.dy *= -1;
                whitePowerUpBall.y = Math.max(whitePowerUpBall.radius, Math.min(whitePowerUpBall.y, c.height - whitePowerUpBall.radius));
            }
        }

        drawRedBallTrails();
        drawRedBalls();
        drawBlueBallTrails();
        drawBlueBalls();

        // Draw magnet field if active
        if (powerUpActive) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(blueBalls[0].x, blueBalls[0].y, ballRadius + 60, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        checkCollision();

        // --- BEPS calculation (do this ONCE per frame) ---
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
            powerupText = "Magnet (Yellow)";
        } else if (purplePowerUpActive) {
            powerupText = "Shrink Red Balls (Purple)";
        } else if (orangePowerUpActive) {
            powerupText = "Freeze Red Balls (Orange)";
        } else if (pinkPowerUpActive) {
            powerupText = "Slow Red Balls (Pink)";
        }
        document.getElementById("activePowerup").innerText = powerupText;

        // --- TIMER LOGIC ---
        let delta = now - lastFrameTime;
        lastFrameTime = now;
        timeLeft -= delta;

        // Update timer display
        const timerDisplay = document.getElementById("timerDisplay");
        if (timerDisplay) {
            timerDisplay.textContent = "Time Left: " + (timeLeft / 1000).toFixed(1) + "s";
            if (timeLeft < 2000) {
                timerDisplay.classList.add("low");
            } else {
                timerDisplay.classList.remove("low");
            }
        }

        // Game over if timer runs out
        if (timeLeft <= 0) {
            await endGame();
            return;
        }

        // <-- Add this line to keep the game loop running -->
        requestAnimationFrame(draw);
    }

    // Show start overlay initially
    document.getElementById("startOverlay").style.display = "flex";

    // Start button logic
    document.getElementById("startBtn").onclick = function() {
        document.getElementById("startOverlay").style.display = "none";
        gameStarted = true;
        survivalStartTime = Date.now();
        lastFrameTime = Date.now();
        animationId = requestAnimationFrame(draw);
    };

    // --- Color pickers ---
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

    // --- Utility ---
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

    window.clearPowerUps = function() {
        // Remove all power-up balls from the field
        powerUpBall = null;
        purplePowerUpBall = null;
        orangePowerUpBall = null;
        pinkPowerUpBall = null;
        whitePowerUpBall = null;

        // Deactivate all power-up effects
        powerUpActive = false;
        purplePowerUpActive = false;
        orangePowerUpActive = false;
        pinkPowerUpActive = false;

        // Remove AI ball and reset any altered states
        redRadius = originalRedRadius;
        speed = normalSpeed;

        // Restore red ball velocities if frozen or slowed
        for (let i = 0; i < redBalls.length; i++) {
            let angle = Math.random() * 2 * Math.PI;
            redBalls[i].dx = Math.cos(angle) * originalRedSpeed;
            redBalls[i].dy = Math.sin(angle) * originalRedSpeed;
        }

        console.log("All power-ups cleared!");
    };

    // Touch controls for mobile
    c.addEventListener("touchstart", function(e) {
        e.preventDefault();
        isTouching = true;
        const rect = c.getBoundingClientRect();
        const touch = e.touches[0];
        touchTarget = {
            x: (touch.clientX - rect.left) * (c.width / rect.width),
            y: (touch.clientY - rect.top) * (c.height / rect.height)
        };
    }, { passive: false });

    c.addEventListener("touchmove", function(e) {
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        const touch = e.touches[0];
        touchTarget = {
            x: (touch.clientX - rect.left) * (c.width / rect.width),
            y: (touch.clientY - rect.top) * (c.height / rect.height)
        };
    }, { passive: false });

    c.addEventListener("touchend", function(e) {
        isTouching = false;
        touchTarget = null;
    }, { passive: false });

    // Mouse hover controls for desktop (ball follows cursor when over canvas)
    c.addEventListener("mouseenter", function(e) {
        isTouching = true;
    });
    c.addEventListener("mousemove", function(e) {
        const rect = c.getBoundingClientRect();
        touchTarget = {
            x: (e.clientX - rect.left) * (c.width / rect.width),
            y: (e.clientY - rect.top) * (c.height / rect.height)
        };
    });
    c.addEventListener("mouseleave", function(e) {
        isTouching = false;
        touchTarget = null;
    });

    let joystickDirection = { x: 0, y: 0 };

    if (window.nipplejs) {
        const joystick = nipplejs.create({
            zone: document.getElementById('joystick-zone'),
            mode: 'static',
            position: { left: '60px', bottom: '60px' },
            color: 'blue'
        });

        joystick.on('move', function (evt, data) {
            if (gameOver) {
                joystickDirection = { x: 0, y: 0 };
                return;
            }
            if (data && data.vector) {
                // Invert Y axis so up on joystick is up on screen
                joystickDirection.x = data.vector.x;
                joystickDirection.y = -data.vector.y;
            }
        });

        joystick.on('end', function () {
            joystickDirection.x = 0;
            joystickDirection.y = 0;
        });
    }

    // Try again button
    document.getElementById("tryAgainBtn").onclick = function() {
        document.body.style.overflow = ""; // Restore scrolling
        location.reload();
    };

    document.getElementById("mainMenuBtn").onclick = function() {
        document.body.style.overflow = ""; // Restore scrolling
        window.location.href = "../index.html";
    };

    // Clear local storage button
    document.getElementById("clearLocalStorageBtn").onclick = async function() {
        if (confirm("Are you sure you want to clear your local storage? This will reset your saved name, leaderboard score, and settings.")) {
            // Get the player's name before clearing localStorage
            const playerName = localStorage.getItem("eb_player_name");
            if (playerName && window.collection && window.query && window.where && window.getDocs && window.db) {
                try {
                    const leaderboardRef = collection(db, "leaderboard");
                    const q = query(leaderboardRef, where("name", "==", playerName));
                    const snapshot = await getDocs(q);
                    for (const doc of snapshot.docs) {
                        await doc.ref.delete();
                    }
                } catch (e) {
                    alert("Could not remove your leaderboard score: " + e.message);
                }
            }
            localStorage.clear();
            alert("Local storage and leaderboard score cleared! Reloading the page...");
            location.reload();
        }
    };

    // After eating or respawning, ensure redBalls.length does not exceed 5
    while (redBalls.length > 5) {
        redBalls.pop();
    }

    // On page load, show leaderboard
    window.showLeaderboardFromFirestore();

    window.db = db;
    window.collection = collection;
    window.query = query;
    window.where = where;
    window.getDocs = getDocs;
});
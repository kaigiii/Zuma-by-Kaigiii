'use strict';

// Levels database
const Levels = [
  {
    name: "經典螺線",
    travelTime: 120000,
    ballCount: 50,
    colorCount: 3,
    pathFunction: (width, height) => {
      const points = [];
      const cx = width / 2;
      const cy = height / 2;
      const dTheta = 0.02;
      const startTheta = Math.PI * 2.5;
      const endTheta = Math.PI * 16;
      const shortestHalf = Math.min(width, height) / 2;
      const margin = 40;
      const a = Math.max(1, (shortestHalf - margin) / endTheta);
      for (let theta = startTheta; theta <= endTheta; theta += dTheta) {
        const r = a * theta;
        points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
      }
      return points.reverse();
    },
  },
  {
    name: "心形線",
    travelTime: 100000,
    ballCount: 60,
    colorCount: 3,
    pathFunction: (width, height) => {
      const points = [];
      const scale = Math.min(width, height) * 0.3;
      const cx = width / 2;
      const cy = height / 2 - scale * 0.8;
      for (let theta = 0; theta <= Math.PI * 2; theta += 0.01) {
        const r = scale * (1 - Math.sin(theta));
        points.push({ x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) });
      }
      return points;
    },
  },
  {
    name: "無限循環",
    travelTime: 90000,
    ballCount: 65,
    colorCount: 3,
    pathFunction: (width, height) => {
      const points = [];
      const scaleX = width * 0.4;
      const scaleY = height * 0.3;
      const cx = width / 2;
      const cy = height / 2;
      for (let t = 0; t <= Math.PI * 2; t += 0.01) {
        points.push({ x: cx + scaleX * Math.sin(t), y: cy + scaleY * Math.sin(2 * t) + height * 0.1 });
      }
      return points;
    },
  },
  {
    name: "蜿蜒巨蛇",
    travelTime: 140000,
    ballCount: 70,
    colorCount: 4,
    pathFunction: (width, height) => {
      const points = [];
      const margin = 50;
      const amplitude = height * 0.35;
      for (let x = margin; x <= width - margin; x += 2) {
        const normalizedX = (x - margin) / (width - margin * 2);
        const y = height * 0.3 + amplitude * Math.sin(normalizedX * Math.PI * 4) * Math.cos(normalizedX * Math.PI * 3);
        points.push({ x, y });
      }
      return points;
    },
  },
  // Custom level option will be provided via UI (button), not listed as fixed level
];

class Launcher {
  constructor(game) {
    this.game = game;
    this.x = this.game.width / 2;
    this.y = this.game.height / 2;
    this.radius = 25;
    this.angle = 0; // radians
    this.nextBall = null;
    this.queuedBall = null;
    // Swap animation state
    this.swapAnimationTimer = 0;
    this.swapDuration = 0.15; // seconds
    this.swapPending = false;
  }

  update(mouseX, mouseY) {
    this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
  }

  draw(ctx) {
    // Body
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Barrel
    const barrelLength = this.radius + 18;
    const tipX = this.x + Math.cos(this.angle) * barrelLength;
    const tipY = this.y + Math.sin(this.angle) * barrelLength;
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    const cx = this.x;
    const cy = this.y;
    const qxBase = this.x + this.radius * 0.8;
    const qyBase = this.y + this.radius * 0.8;
    const nextBaseR = this.nextBall ? this.nextBall.radius : 0;
    const queuedBaseR = this.queuedBall ? this.queuedBall.radius * 0.6 : 0;

    const isAnimating = this.swapAnimationTimer > 0 && this.nextBall && this.queuedBall;
    if (isAnimating) {
      const progress = Math.max(0, Math.min(1, this.swapAnimationTimer / this.swapDuration)); // 1->0
      const t = 1 - progress; // 0->1

      // nextBall moves from center to queued position and shrinks
      const nX = cx + (qxBase - cx) * t;
      const nY = cy + (qyBase - cy) * t;
      const nR = nextBaseR + (queuedBaseR - nextBaseR) * t;
      ctx.fillStyle = this.nextBall.color;
      ctx.beginPath();
      ctx.arc(nX, nY, nR, 0, Math.PI * 2);
      ctx.fill();

      // queuedBall moves from queued position to center and grows
      const qX = qxBase + (cx - qxBase) * t;
      const qY = qyBase + (cy - qyBase) * t;
      const qR = queuedBaseR + (nextBaseR - queuedBaseR) * t;
      ctx.fillStyle = this.queuedBall.color;
      ctx.beginPath();
      ctx.arc(qX, qY, qR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Next ball preview at center
      if (this.nextBall) {
        this.nextBall.x = this.x;
        this.nextBall.y = this.y;
        this.nextBall.draw(ctx);
      }
      // Queued (backup) ball at lower-right of launcher
      if (this.queuedBall) {
        const qRadius = this.queuedBall.radius * 0.6;
        ctx.fillStyle = this.queuedBall.color;
        ctx.beginPath();
        ctx.arc(qxBase, qyBase, qRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  loadNextBall() {
    // Promote queued -> next, and create a new queued
    this.nextBall = this.queuedBall;
    const newColor = this.game.colors[Math.floor(Math.random() * this.game.colors.length)];
    const newPreview = new Ball(this.game, 0, newColor);
    newPreview.x = this.x;
    newPreview.y = this.y;
    this.queuedBall = newPreview;
    // If nextBall is null (first call), generate it now
    if (!this.nextBall) {
      const firstColor = this.game.colors[Math.floor(Math.random() * this.game.colors.length)];
      const first = new Ball(this.game, 0, firstColor);
      first.x = this.x;
      first.y = this.y;
      this.nextBall = first;
    }
  }

  swapBalls() {
    if (this.swapAnimationTimer > 0) return; // ignore if animating
    if (!this.nextBall || !this.queuedBall) return;
    this.swapAnimationTimer = this.swapDuration;
    this.swapPending = true;
  }
}

class Ball {
  constructor(game, pathIndex, color) {
    this.game = game;
    this.radius = 12;
    this.color = color;
    this.pathIndex = pathIndex; // float index along pathPoints
    this.x = 0;
    this.y = 0;
    this.isVanishing = false;
    this.vanishTimer = 1; // seconds fraction for fade-out scale
  }

  update(dt) {
    // Movement is controlled by Game (leader-follower)
  }

  updateCoordinates() {
    if (!this.game.pathPoints || this.game.pathPoints.length < 2) return;
    const maxIndex = this.game.pathPoints.length - 1;
    const clamped = Math.max(0, Math.min(this.pathIndex, maxIndex));
    const i0 = Math.floor(clamped);
    const i1 = Math.min(i0 + 1, maxIndex);
    const t = clamped - i0;
    const p0 = this.game.pathPoints[i0];
    const p1 = this.game.pathPoints[i1];
    this.x = p0.x + (p1.x - p0.x) * t;
    this.y = p0.y + (p1.y - p0.y) * t;
  }

  draw(ctx) {
    ctx.save();
    if (this.isVanishing) {
      const t = Math.max(0, Math.min(1, this.vanishTimer));
      ctx.globalAlpha = t;
      const r = this.radius * t;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class Projectile extends Ball {
  constructor(game, color, angle) {
    super(game, 0, color);
    const barrelLength = game.launcher.radius; // start at barrel tip
    const startX = game.launcher.x + Math.cos(angle) * barrelLength;
    const startY = game.launcher.y + Math.sin(angle) * barrelLength;
    this.x = startX;
    this.y = startY;
    this.speed = 800; // px/sec
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

class Game {
  constructor(canvas, levelData) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    // Responsive canvas size
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Level data
    this.level = levelData;
    this.level.name = levelData.name || '自訂關卡';

    // Path and chain state
    this.pathPoints = [];
    this.colors = (this.level && this.level.colors) || ['#ff6347', '#90ee90', '#add8e6'];
    if (!Array.isArray(this.colors) || this.colors.length === 0) {
      this.colors = ['#ff6347', '#90ee90', '#add8e6'];
    }
    this.balls = [];
    this.projectiles = [];
    this.travelTime = (this.level && this.level.travelTime) || 120000; // ms to traverse full path
    this.attractionSpeed = 600; // indices per second for gap closure
    this.indicesPerBall = 10; // approximate index spacing per ball diameter
    this.targetBallCount = (this.level && this.level.ballCount) || 50;
    // Game state flags
    this.spawningComplete = false;
    this.gameOver = false;
    this.gameWon = false;
    // Spawn queue for perfect intro animation
    this.spawnQueue = [];
    this.ballSpawnTimer = 0;
    this.ballSpawnInterval = 0.15;

    // Additional state can be added as needed
    this.lastTimestamp = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerElement = document.getElementById('timer');

    // Mouse tracking (canvas local coordinates)
    this.mouse = { x: this.width / 2, y: this.height / 2 };
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    });

    // Launcher at center
    this.launcher = new Launcher(this);

    // Fire on click
    this.canvas.addEventListener('mousedown', () => {
      if (!this.launcher.nextBall) return;
      const proj = new Projectile(this, this.launcher.nextBall.color, this.launcher.angle);
      this.projectiles.push(proj);
      this.launcher.loadNextBall();
    });

    // Calculate initial path
    this.calculatePath();
    // Initialize full chain off-path for slide-in animation
    this.initBallChain();

    // Setup resize handling
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    // Ensure sizes and path are current
    this.resize();

    // Load preview balls
    this.launcher.loadNextBall();
    this.launcher.loadNextBall();

    // Reset on 'R' key when game ended
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'r' || e.key === 'R') && (this.gameOver || this.gameWon)) {
        this.reset();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.launcher.swapBalls();
      }
    });

    // (UI bindings removed; handled by external controller in future)
  }


  drawMessage(text) {
    const ctx = this.ctx;
    const padding = 20;
    const fontSize = Math.max(28, Math.min(64, Math.floor(Math.min(this.width, this.height) * 0.08)));
    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize + padding * 2;
    const x = this.width / 2;
    const y = this.height / 2;

    // backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);

    // text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    // sub-hint
    ctx.font = `${Math.floor(fontSize * 0.5)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('按 R 鍵返回主選單', x, y + fontSize * 0.8);
    ctx.restore();
  }

  // Draw Archimedean spiral path r = a * theta from center outward
  drawPath() {
    if (!this.pathPoints || this.pathPoints.length === 0) return;
    const pts = this.pathPoints;
    this.ctx.save();
    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      this.ctx.lineTo(pts[i].x, pts[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
    this.drawEndpoint();
  }

  drawEndpoint() {
    if (!this.pathPoints || this.pathPoints.length === 0) return;
    const end = this.pathPoints[this.pathPoints.length - 1];
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD54F';
    ctx.fillStyle = 'rgba(255, 213, 79, 0.2)';
    const r = 10;
    ctx.beginPath();
    ctx.arc(end.x, end.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millis = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const mmm = String(millis).padStart(3, '0');
    return `${mm}:${ss}.${mmm}`;
  }

  // Precompute spiral path points, with outermost at index 0
  calculatePath() {
    if (this.level && typeof this.level.pathFunction === 'function') {
      this.pathPoints = this.level.pathFunction(this.width, this.height);
    } else {
      console.error('無效的關卡資料或路徑函數！');
      this.pathPoints = [{ x: 0, y: 0 }];
    }
  }

  reset() {}

  // Initialize spawn queue for perfect slide-in animation
  initBallChain() {
    this.balls = [];
    this.spawnQueue = [];
    for (let i = 0; i < this.targetBallCount; i++) {
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      this.spawnQueue.push({ color });
    }
    this.spawningComplete = false;
  }

  // Find the path index that is targetDistance ahead from startIndex along pathPoints
  findIndexAtDistance(startIndex, targetDistance) {
    if (!this.pathPoints || this.pathPoints.length < 2) return startIndex;
    const maxIndex = this.pathPoints.length - 1;
    let i = Math.floor(Math.max(0, Math.min(startIndex, maxIndex)));
    let t = Math.max(0, Math.min(startIndex - i, 1));
    // Start position
    let pCurr = this.pathPoints[i];
    let pNext = this.pathPoints[Math.min(i + 1, maxIndex)];
    let currX = pCurr.x + (pNext.x - pCurr.x) * t;
    let currY = pCurr.y + (pNext.y - pCurr.y) * t;
    let remaining = targetDistance;

    // Walk segments until remaining is consumed
    while (remaining > 0 && i < maxIndex) {
      pCurr = this.pathPoints[i];
      pNext = this.pathPoints[i + 1];
      const segDX = pNext.x - pCurr.x;
      const segDY = pNext.y - pCurr.y;
      const segLen = Math.hypot(segDX, segDY);
      // distance from current point along this segment
      const fromCurrToPoint = Math.hypot(currX - pCurr.x, currY - pCurr.y);
      const segRemaining = Math.max(0, segLen - fromCurrToPoint);
      if (remaining <= segRemaining) {
        const advance = (fromCurrToPoint + remaining) / segLen; // within [0,1]
        const newT = Math.max(0, Math.min(advance, 1));
        return i + newT;
      } else {
        remaining -= segRemaining;
        i += 1;
        currX = pNext.x;
        currY = pNext.y;
        t = 0;
      }
    }
    return Math.min(i, maxIndex);
  }

  // After inserting a ball, check for 3+ contiguous same-color and remove
  checkMatches(checkIndex) {
    if (checkIndex < 0 || checkIndex >= this.balls.length) return;
    const targetBall = this.balls[checkIndex];
    if (!targetBall) return;
    const targetColor = targetBall.color;
    const matches = [targetBall];

    // scan left
    for (let i = checkIndex - 1; i >= 0; i--) {
      if (this.balls[i].color === targetColor) {
        matches.unshift(this.balls[i]);
      } else {
        break;
      }
    }
    // scan right
    for (let i = checkIndex + 1; i < this.balls.length; i++) {
      if (this.balls[i].color === targetColor) {
        matches.push(this.balls[i]);
      } else {
        break;
      }
    }

    if (matches.length >= 3) {
      // Trigger vanish animation instead of immediate removal
      for (const b of matches) {
        b.isVanishing = true;
        b.vanishTimer = 1;
      }
    }
  }

  // Initialize is now handled by spawn logic in update()

  // Handle responsive canvas
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Recenter launcher
    if (this.launcher) {
      this.launcher.x = this.width / 2;
      this.launcher.y = this.height / 2;
    }

    // Recalculate path and re-evaluate ball positions
    this.calculatePath();
    // Keep relative ordering by clamping indices and updating positions
    for (const b of this.balls) b.update(0);
  }

  // Clear the entire canvas each frame
  update(dt) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw spiral path
    this.drawPath();
    if (!this.gameOver && !this.gameWon) {
      // timer
      this.elapsedTime += dt;
      // Update and draw launcher
      this.launcher.update(this.mouse.x, this.mouse.y);
      this.launcher.draw(this.ctx);
      if (this.launcher.swapAnimationTimer > 0) {
        this.launcher.swapAnimationTimer -= dt;
        if (this.launcher.swapAnimationTimer <= 0 && this.launcher.swapPending) {
          // finalize swap
          [this.launcher.nextBall, this.launcher.queuedBall] = [this.launcher.queuedBall, this.launcher.nextBall];
          this.launcher.swapPending = false;
          this.launcher.swapAnimationTimer = 0;
        }
      }

      // Spawn from queue: one ball at a time at the head (index 0)
      if (this.spawnQueue.length > 0) {
        this.ballSpawnTimer += dt;
        if (this.ballSpawnTimer >= this.ballSpawnInterval) {
          this.ballSpawnTimer = 0;
          const nextBallData = this.spawnQueue.shift();
          const newBall = new Ball(this, 0, nextBallData.color);
          newBall.updateCoordinates();
          this.balls.unshift(newBall);
          // Push followers forward to make room using physical spacing
          for (let i = 1; i < this.balls.length; i++) {
            const leader = this.balls[i - 1];
            const follower = this.balls[i];
            follower.pathIndex = this.findIndexAtDistance(leader.pathIndex, follower.radius * 2);
          }
          if (this.spawnQueue.length === 0) this.spawningComplete = true;
        }
      }

      // Leader-follower update for ball chain
      if (this.balls.length > 0) {
        // Move head along path based on travelTime
        const head = this.balls[0];
        const indicesPerSecond = this.pathPoints.length / (this.travelTime / 1000);
        head.pathIndex = Math.min(head.pathIndex + indicesPerSecond * dt, this.pathPoints.length - 1);

        // Followers: maintain fixed physical spacing (diameter) with attraction animation
      for (let i = 1; i < this.balls.length; i++) {
          const leader = this.balls[i - 1];
          const follower = this.balls[i];
          const targetPathIndex = this.findIndexAtDistance(leader.pathIndex, follower.radius * 2);
          const currentPathIndex = follower.pathIndex;
          if (currentPathIndex > targetPathIndex) {
            const newIndex = Math.max(targetPathIndex, currentPathIndex - this.attractionSpeed * dt);
            const closedThisFrame = (newIndex === targetPathIndex);
            follower.pathIndex = newIndex;
          if (Number.isNaN(follower.pathIndex)) follower.pathIndex = leader.pathIndex;
            if (closedThisFrame && leader.color === follower.color) {
              this.checkMatches(i - 1);
            }
          } else {
            follower.pathIndex = targetPathIndex;
          if (Number.isNaN(follower.pathIndex)) follower.pathIndex = leader.pathIndex;
          }
        }

        // Compute coordinates and render; also update vanish timers and cleanup
        for (let i = this.balls.length - 1; i >= 0; i--) {
          const b = this.balls[i];
          b.updateCoordinates();
          if (b.isVanishing) {
            b.vanishTimer -= dt * 3; // faster fade
            if (b.vanishTimer <= 0) {
              this.balls.splice(i, 1);
              continue;
            }
          }
          b.draw(this.ctx);
        }

        // Lose condition: last (tail) ball reached end of path (center)
        const lastBall = this.balls[this.balls.length - 1];
        if (lastBall && lastBall.pathIndex >= this.pathPoints.length - 1) {
          this.gameOver = true;
        }
      }

      // Update and draw projectiles; cull out-of-bounds
      const margin = 100;
      const left = -margin, right = this.width + margin, top = -margin, bottom = this.height + margin;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.update(dt);
        if (p.x < left || p.x > right || p.y < top || p.y > bottom) {
          this.projectiles.splice(i, 1);
        } else {
          // Collision with balls
          let collided = false;
          for (let j = 0; j < this.balls.length; j++) {
            const b = this.balls[j];
            const dx = p.x - b.x;
            const dy = p.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= (p.radius + b.radius)) {
              // Remove projectile
              this.projectiles.splice(i, 1);

              // Decide insertion side
              let insertIndex;
              if (j > 0) {
                const prev = this.balls[j - 1];
                const dPrev = Math.hypot(p.x - prev.x, p.y - prev.y);
                if (dPrev < dist) {
                  // insert before b
                  insertIndex = j;
                } else {
                  // insert after b
                  insertIndex = j + 1;
                }
              } else {
                // At head; compare to next if exists
                if (this.balls.length > 1) {
                  const next = this.balls[j + 1];
                  const dNext = Math.hypot(p.x - next.x, p.y - next.y);
                  insertIndex = (dist <= dNext) ? j : j + 1;
                } else {
                  insertIndex = j + 1; // only one ball, append after
                }
              }

              // Create new chain ball
              const color = p.color || this.launcher.nextBall?.color || '#ffffff';
              const newBall = new Ball(this, 0, color);
              // Assign pathIndex based on insertion reference; slight offset forward for next-frame correction
              if (insertIndex > 0) {
                newBall.pathIndex = this.balls[insertIndex - 1].pathIndex + 0.01;
              } else {
                newBall.pathIndex = this.balls[0]?.pathIndex ?? 0;
              }
              newBall.updateCoordinates();
              this.balls.splice(insertIndex, 0, newBall);

              // Check matches around insertion
              this.checkMatches(Math.min(insertIndex, this.balls.length - 1));

              collided = true;
              break;
            }
          }
          if (!collided) {
            p.draw(this.ctx);
          }
        }
      }
      // Win condition: no balls remain after all spawns completed
      if (this.spawningComplete && this.balls.length === 0) {
        this.gameWon = true;
      }
    }

    // Update timer display always
    if (this.timerElement) {
      this.timerElement.textContent = this.formatTime(this.elapsedTime);
    }
  }
}

function animate(game, timestamp) {
  if (!game._startTime) game._startTime = timestamp;
  const dt = (timestamp - (game.lastTimestamp || timestamp)) / 1000; // seconds
  game.lastTimestamp = timestamp;

  game.update(dt);
  requestAnimationFrame((t) => animate(game, t));
}

window.addEventListener('load', () => {
  const levelSelectScreen = document.getElementById('level-select-screen');
  const levelButtonsContainer = document.getElementById('level-buttons-container');
  const canvas = document.getElementById('gameCanvas');
  const settingsPanel = document.getElementById('settings-panel');
  const speedSlider = document.getElementById('speed');
  const speedValue = document.getElementById('speedValue');
  const ballCountSlider = document.getElementById('ballCount');
  const ballCountValue = document.getElementById('ballCountValue');
  const colorCountSlider = document.getElementById('colorCount');
  const colorCountValue = document.getElementById('colorCountValue');
  const startButton = document.getElementById('start-game-button');
  const splash = document.getElementById('splash-screen');
  const gameUI = document.getElementById('game-ui-overlay');
  const backButton = document.getElementById('back-to-menu-button');
  const gameOverScreen = document.getElementById('game-over-screen');
  const gameOverMessage = document.getElementById('game-over-message');
  const restartLevelButton = document.getElementById('restart-level-button');
  const returnToMenuButton = document.getElementById('return-to-menu-button');
  const customEditor = document.getElementById('custom-level-editor');
  const formulaXInput = document.getElementById('formulaX');
  const formulaYInput = document.getElementById('formulaY');
  const formulaError = document.getElementById('formula-error');
  const helpModal = document.getElementById('help-modal');
  const helpButton = document.getElementById('help-button');
  const helpClose = helpModal ? helpModal.querySelector('.close-button') : null;

  let game = null;
  let selectedLevel = null;
  let currentLevelConfig = null;
  let onKeyDownRef = null;

  canvas.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  levelSelectScreen.classList.add('hidden');
  gameUI.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  function showMainMenu() {
    game = null;
    canvas.classList.add('hidden');
    gameUI.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    splash.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
    settingsPanel.classList.add('hidden');
    if (onKeyDownRef) {
      window.removeEventListener('keydown', onKeyDownRef);
      onKeyDownRef = null;
    }
  }

  splash.addEventListener('click', () => {
    splash.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
  });

  Levels.forEach((level) => {
    const button = document.createElement('button');
    button.textContent = level.name;
    button.onclick = () => {
      levelButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      selectedLevel = level;
      ballCountSlider.value = String(level.ballCount || 50);
      ballCountValue.textContent = String(level.ballCount || 50);
      const seconds = Math.max(1, Math.floor((level.travelTime || 120000) / 1000));
      speedSlider.value = String(seconds);
      speedValue.textContent = String(seconds);
      const cc = level.colorCount || 3;
      colorCountSlider.value = String(cc);
      colorCountValue.textContent = String(cc);
      settingsPanel.classList.remove('hidden');
      customEditor.classList.add('hidden');
    };
    levelButtonsContainer.appendChild(button);
  });

  // Add Custom Level button
  const customBtn = document.createElement('button');
  customBtn.textContent = '自訂關卡';
  customBtn.onclick = () => {
    levelButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
    customBtn.classList.add('selected');
    selectedLevel = 'custom';
    customEditor.classList.remove('hidden');
    settingsPanel.classList.remove('hidden');
    formulaError.classList.add('hidden');
  };
  levelButtonsContainer.appendChild(customBtn);

  // Help modal bindings
  if (helpButton && helpModal) {
    helpButton.addEventListener('click', () => {
      helpModal.classList.remove('hidden');
    });
  }
  if (helpClose && helpModal) {
    helpClose.addEventListener('click', () => helpModal.classList.add('hidden'));
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.classList.add('hidden');
    });
  }

  speedSlider.addEventListener('input', () => {
    speedValue.textContent = speedSlider.value;
  });
  ballCountSlider.addEventListener('input', () => {
    ballCountValue.textContent = ballCountSlider.value;
  });
  colorCountSlider.addEventListener('input', () => {
    colorCountValue.textContent = colorCountSlider.value;
  });

  function startGame(levelConfig) {
    currentLevelConfig = levelConfig;
    levelSelectScreen.classList.add('hidden');
    settingsPanel.classList.add('hidden');
    customEditor.classList.add('hidden');
    canvas.classList.remove('hidden');
    gameUI.classList.remove('hidden');

    game = new Game(canvas, levelConfig);

    function onKeyDown(e) {
      if (!game) return;
      if (e.code === 'Space') {
        e.preventDefault();
        game.launcher.swapBalls();
      }
    }
    onKeyDownRef = onKeyDown;
    window.addEventListener('keydown', onKeyDownRef);

    function rafLoop(timeMs) {
      if (game) {
        const dt = (game.lastTimestamp ? (timeMs - game.lastTimestamp) / 1000 : 0);
        game.lastTimestamp = timeMs;
        game.update(dt);
        if (game.gameOver || game.gameWon) {
          gameOverScreen.classList.remove('hidden');
          gameOverMessage.textContent = game.gameWon ? 'YOU WIN!' : 'GAME OVER';
        }
        requestAnimationFrame(rafLoop);
      }
    }
    requestAnimationFrame(rafLoop);

    backButton.onclick = () => {
      showMainMenu();
    };
    returnToMenuButton.onclick = () => {
      showMainMenu();
    };
    restartLevelButton.onclick = () => {
      if (!currentLevelConfig) return;
      game = null;
      gameOverScreen.classList.add('hidden');
      canvas.classList.remove('hidden');
      gameUI.classList.remove('hidden');
      levelSelectScreen.classList.add('hidden');
      settingsPanel.classList.add('hidden');
      startGame(currentLevelConfig);
    };
  }

  startButton.addEventListener('click', () => {
    const masterColors = ['#ff6347', '#90ee90', '#add8e6', '#ffd700', '#da70d6', '#ffa500'];
    if (selectedLevel === 'custom') {
      formulaError.classList.add('hidden');
      const xFormula = formulaXInput.value.trim();
      const yFormula = formulaYInput.value.trim();
      try {
        const body = `return { x: width/2 + (${xFormula}), y: height/2 + (${yFormula}) };`;
        // eslint-disable-next-line no-new-func
        const customPathFunction = new Function('t', 'width', 'height', body);
        const runtimeLevel = {
          name: '自訂關卡',
          pathFunction: (width, height) => {
            const pts = [];
            for (let t = 0; t <= 12.5; t += 0.01) {
              const p = customPathFunction(t, width, height);
              pts.push({ x: p.x, y: p.y });
            }
            return pts;
          },
          travelTime: parseInt(speedSlider.value, 10) * 1000,
          ballCount: parseInt(ballCountSlider.value, 10),
          colors: masterColors.slice(0, Math.max(2, Math.min(parseInt(colorCountSlider.value, 10) || 3, masterColors.length)))
        };
        startGame(runtimeLevel);
        return;
      } catch (e) {
        formulaError.textContent = '公式語法錯誤，請檢查！';
        formulaError.classList.remove('hidden');
        return;
      }
    }
    if (!selectedLevel) return;
    const runtimeLevel = {
      name: selectedLevel.name,
      pathFunction: selectedLevel.pathFunction,
      travelTime: parseInt(speedSlider.value, 10) * 1000,
      ballCount: parseInt(ballCountSlider.value, 10),
      colors: masterColors.slice(0, Math.max(2, Math.min(parseInt(colorCountSlider.value, 10) || 3, masterColors.length)))
    };
    startGame(runtimeLevel);
  });

  // removed standalone custom create button logic (merged into Start)
});



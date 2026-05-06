const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const statusText = document.getElementById('statusText');
const comboText = document.getElementById('comboText');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const keys = new Set();

let player, shots, enemies, sparks, stars, score, lives, wave, running, paused, enemyDir, enemySpeed, lastShot, combo, comboTimer, best;

const storageKey = 'cosmic-defender-best';
best = Number(localStorage.getItem(storageKey) || 0);
bestEl.textContent = best;

function makeStars() {
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + .25,
    v: Math.random() * .85 + .18,
    a: Math.random() * .55 + .18
  }));
}

function reset() {
  player = { x: canvas.width / 2, y: canvas.height - 58, w: 66, h: 28, speed: 7.4, shield: 0 };
  shots = [];
  sparks = [];
  score = 0;
  lives = 3;
  wave = 1;
  combo = 1;
  comboTimer = 0;
  paused = false;
  lastShot = 0;
  makeStars();
  spawnWave();
  updateHud();
  setStatus('Первая волна на радаре');
}

function spawnWave() {
  enemies = [];
  enemyDir = 1;
  enemySpeed = 0.72 + wave * 0.13;
  const rows = Math.min(3 + Math.floor(wave / 2), 6);
  const cols = 9;
  const spacingX = 82;
  const spacingY = 50;
  const startX = (canvas.width - (cols - 1) * spacingX) / 2 - 20;
  const startY = 78;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        w: 40,
        h: 28,
        hp: 1 + Math.floor(wave / 4),
        phase: Math.random() * Math.PI,
        type: r % 3
      });
    }
  }
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score.toLocaleString('ru-RU');
  livesEl.textContent = lives;
  waveEl.textContent = wave;
  comboText.textContent = `COMBO ×${combo}`;
  if (score > best) {
    best = score;
    localStorage.setItem(storageKey, best);
    bestEl.textContent = best.toLocaleString('ru-RU');
  }
}

function setStatus(text) { statusText.textContent = text; }

function startGame() {
  reset();
  running = true;
  overlay.classList.add('hidden');
}

function fire() {
  const now = performance.now();
  if (now - lastShot < 205 || !running || paused) return;
  shots.push({ x: player.x, y: player.y - 26, r: 4.5, vy: -11.5, glow: 1 });
  lastShot = now;
}

function hit(a, b) {
  return a.x - (a.w || a.r) < b.x + b.w &&
    a.x + (a.w || a.r) > b.x &&
    a.y - (a.h || a.r) < b.y + b.h &&
    a.y + (a.h || a.r) > b.y;
}

function burst(x, y, color = '#38e8ff', count = 14) {
  for (let i = 0; i < count; i++) {
    sparks.push({
      x, y,
      vx: (Math.random() - .5) * 7,
      vy: (Math.random() - .5) * 7,
      life: 24 + Math.random() * 10,
      max: 34,
      color,
      size: Math.random() * 3 + 1
    });
  }
}

function update() {
  if (!running || paused) return;

  stars.forEach(s => {
    s.y += s.v;
    if (s.y > canvas.height) { s.y = -5; s.x = Math.random() * canvas.width; }
  });

  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) player.x -= player.speed;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) player.x += player.speed;
  player.x = Math.max(42, Math.min(canvas.width - 42, player.x));

  shots.forEach(s => s.y += s.vy);
  shots = shots.filter(s => s.y > -22);

  let edge = false;
  enemies.forEach(e => {
    e.x += enemyDir * enemySpeed;
    e.phase += .045;
    if (e.x < 30 || e.x + e.w > canvas.width - 30) edge = true;
  });
  if (edge) {
    enemyDir *= -1;
    enemies.forEach(e => e.y += 22 + wave * 1.2);
  }

  for (const s of shots) {
    for (const e of enemies) {
      if (!e.dead && hit(s, e)) {
        s.dead = true;
        e.hp -= 1;
        comboTimer = 150;
        burst(s.x, s.y, '#ffe86a', 8);
        if (e.hp <= 0) {
          e.dead = true;
          score += Math.round((105 + wave * 18) * combo);
          combo = Math.min(combo + 1, 9);
          burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 0 ? '#ff4fd8' : '#38e8ff', 18);
          setStatus(combo >= 4 ? 'Комбо растёт — держи темп!' : 'Цель уничтожена');
        }
        break;
      }
    }
  }
  shots = shots.filter(s => !s.dead);
  enemies = enemies.filter(e => !e.dead);

  if (comboTimer > 0) comboTimer -= 1;
  else combo = 1;

  if (enemies.some(e => e.y + e.h > player.y - 12)) {
    lives -= 1;
    combo = 1;
    burst(player.x, player.y, '#ff5e77', 28);
    if (lives <= 0) return endGame('Станция захвачена', 'Дроны прорвали линию обороны. Попробуй ещё раз и держи дистанцию.');
    setStatus('Щит повреждён — новая линия обороны');
    spawnWave();
  }

  if (enemies.length === 0) {
    wave += 1;
    score += 500 + wave * 40;
    combo = Math.min(combo + 1, 9);
    setStatus(`Волна ${wave}: усиление противника`);
    burst(canvas.width / 2, canvas.height / 2, '#7cff9b', 34);
    spawnWave();
  }

  sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .04; p.life--; });
  sparks = sparks.filter(p => p.life > 0);
  updateHud();
}

function endGame(title, text) {
  running = false;
  updateHud();
  overlay.innerHTML = `
    <div class="modal">
      <p class="modal-kicker">mission report</p>
      <h2>${title}</h2>
      <p>${text}<br>Счёт: <b>${score.toLocaleString('ru-RU')}</b> · Волна: <b>${wave}</b> · Рекорд: <b>${best.toLocaleString('ru-RU')}</b></p>
      <button id="restartBtn" class="primary-btn">Играть ещё</button>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('restartBtn').onclick = startGame;
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = '#38e8ff';
  ctx.shadowBlur = 22;
  const grad = ctx.createLinearGradient(0, -30, 0, 26);
  grad.addColorStop(0, '#f8fbff');
  grad.addColorStop(.35, '#38e8ff');
  grad.addColorStop(1, '#1569ff');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(39, 22);
  ctx.lineTo(13, 15);
  ctx.lineTo(0, 29);
  ctx.lineTo(-13, 15);
  ctx.lineTo(-39, 22);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffe86a';
  ctx.fillRect(-7, 9, 14, 20);
  ctx.restore();
}

function drawEnemy(e) {
  const bob = Math.sin(e.phase) * 3.4;
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2 + bob);
  ctx.shadowColor = e.type === 1 ? '#38e8ff' : '#ff4fd8';
  ctx.shadowBlur = 16;
  ctx.fillStyle = e.type === 1 ? '#38e8ff' : e.type === 2 ? '#ffe86a' : '#ff4fd8';
  ctx.beginPath();
  ctx.roundRect(-20, -12, 40, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#7cff9b';
  ctx.beginPath();
  ctx.roundRect(-11, -19, 22, 9, 5);
  ctx.fill();
  ctx.fillStyle = '#030511';
  ctx.fillRect(-10, -3, 6, 6);
  ctx.fillRect(4, -3, 6, 6);
  ctx.restore();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(56,232,255,.13)';
  ctx.lineWidth = 1;
  for (let y = 42; y < canvas.height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,79,216,.42)';
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 98);
  ctx.lineTo(canvas.width, canvas.height - 98);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#040716');
  bg.addColorStop(.58, '#070b22');
  bg.addColorStop(1, '#02030a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(s => {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  drawGrid();
  enemies.forEach(drawEnemy);

  shots.forEach(s => {
    ctx.save();
    ctx.shadowColor = '#ffe86a';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffe86a';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  sparks.forEach(p => {
    ctx.globalAlpha = Math.max(p.life / p.max, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });

  drawShip(player.x, player.y);

  if (paused && running) {
    ctx.fillStyle = 'rgba(3,5,17,.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '900 58px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
  }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

function setPressed(key, on) { on ? keys.add(key) : keys.delete(key); }
function bindHold(id, key) {
  const el = document.getElementById(id);
  const down = e => { e.preventDefault(); setPressed(key, true); };
  const up = e => { e.preventDefault(); setPressed(key, false); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}

document.addEventListener('keydown', e => {
  keys.add(e.key);
  if (e.code === 'Space') { e.preventDefault(); fire(); }
  if (e.key.toLowerCase() === 'p' && running) { paused = !paused; setStatus(paused ? 'Пауза включена' : 'Миссия продолжается'); }
});
document.addEventListener('keyup', e => keys.delete(e.key));

startBtn.onclick = startGame;
pauseBtn.onclick = () => { if (running) { paused = !paused; setStatus(paused ? 'Пауза включена' : 'Миссия продолжается'); } };
document.getElementById('fireBtn').addEventListener('pointerdown', e => { e.preventDefault(); fire(); });
bindHold('leftBtn', 'ArrowLeft');
bindHold('rightBtn', 'ArrowRight');

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

reset();
setStatus('Станция в режиме ожидания');
draw();
loop();

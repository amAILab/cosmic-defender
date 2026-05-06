const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const keys = new Set();

let player, shots, enemies, sparks, score, lives, wave, running, paused, enemyDir, enemySpeed, lastShot;

function reset() {
  player = { x: canvas.width / 2, y: canvas.height - 54, w: 58, h: 24, speed: 7 };
  shots = [];
  sparks = [];
  score = 0;
  lives = 3;
  wave = 1;
  paused = false;
  lastShot = 0;
  spawnWave();
  updateHud();
}

function spawnWave() {
  enemies = [];
  enemyDir = 1;
  enemySpeed = 0.8 + wave * 0.14;
  const rows = Math.min(3 + Math.floor(wave / 2), 6);
  const cols = 9;
  const startX = 110;
  const startY = 70;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({ x: startX + c * 78, y: startY + r * 48, w: 38, h: 26, hp: 1 + Math.floor(wave / 4), phase: Math.random() * Math.PI });
    }
  }
  waveEl.textContent = wave;
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  waveEl.textContent = wave;
}

function startGame() {
  reset();
  running = true;
  overlay.classList.add('hidden');
}

function fire() {
  const now = performance.now();
  if (now - lastShot < 230 || !running || paused) return;
  shots.push({ x: player.x, y: player.y - 22, r: 4, vy: -10 });
  lastShot = now;
}

function hit(a, b) {
  return a.x - (a.w || a.r) < b.x + b.w && a.x + (a.w || a.r) > b.x && a.y - (a.h || a.r) < b.y + b.h && a.y + (a.h || a.r) > b.y;
}

function burst(x, y, color = '#43e7ff') {
  for (let i = 0; i < 12; i++) sparks.push({ x, y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: 22, color });
}

function update() {
  if (!running || paused) return;
  if (keys.has('ArrowLeft') || keys.has('a')) player.x -= player.speed;
  if (keys.has('ArrowRight') || keys.has('d')) player.x += player.speed;
  player.x = Math.max(36, Math.min(canvas.width - 36, player.x));

  shots.forEach(s => s.y += s.vy);
  shots = shots.filter(s => s.y > -20);

  let edge = false;
  enemies.forEach(e => {
    e.x += enemyDir * enemySpeed;
    e.phase += .04;
    if (e.x < 34 || e.x + e.w > canvas.width - 34) edge = true;
  });
  if (edge) {
    enemyDir *= -1;
    enemies.forEach(e => e.y += 22 + wave * 1.3);
  }

  for (const s of shots) {
    for (const e of enemies) {
      if (!e.dead && hit(s, e)) {
        s.dead = true;
        e.hp -= 1;
        burst(s.x, s.y, '#ffe66d');
        if (e.hp <= 0) { e.dead = true; score += 100 + wave * 15; burst(e.x + e.w / 2, e.y + e.h / 2, '#ff4fd8'); }
        break;
      }
    }
  }
  shots = shots.filter(s => !s.dead);
  enemies = enemies.filter(e => !e.dead);

  if (enemies.some(e => e.y + e.h > player.y - 12)) {
    lives -= 1;
    burst(player.x, player.y, '#ff4fd8');
    if (lives <= 0) return endGame('Станция захвачена');
    spawnWave();
  }

  if (enemies.length === 0) {
    wave += 1;
    score += 500;
    spawnWave();
  }

  sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  sparks = sparks.filter(p => p.life > 0);
  updateHud();
}

function endGame(title) {
  running = false;
  overlay.innerHTML = `<h2>${title}</h2><p>Финальный счёт: ${score}. Волна: ${wave}</p><button id="restartBtn">Играть ещё</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('restartBtn').onclick = startGame;
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#43e7ff';
  ctx.beginPath();
  ctx.moveTo(0, -24); ctx.lineTo(36, 20); ctx.lineTo(12, 14); ctx.lineTo(0, 24); ctx.lineTo(-12, 14); ctx.lineTo(-36, 20); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe66d';
  ctx.fillRect(-7, 5, 14, 18);
  ctx.restore();
}

function drawEnemy(e) {
  const bob = Math.sin(e.phase) * 3;
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2 + bob);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillRect(-18, -10, 36, 20);
  ctx.fillStyle = '#7dff9b';
  ctx.fillRect(-10, -16, 20, 8);
  ctx.fillStyle = '#030511';
  ctx.fillRect(-10, -3, 6, 6); ctx.fillRect(4, -3, 6, 6);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(67,231,255,.16)';
  for (let y = 40; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,79,216,.42)';
  ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(0, canvas.height - 92); ctx.lineTo(canvas.width, canvas.height - 92); ctx.stroke(); ctx.setLineDash([]);
  enemies.forEach(drawEnemy);
  ctx.fillStyle = '#ffe66d';
  shots.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
  sparks.forEach(p => { ctx.globalAlpha = p.life / 22; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; });
  drawShip(player.x, player.y);
  if (paused && running) { ctx.fillStyle = 'rgba(3,5,17,.68)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#fff'; ctx.font = 'bold 54px system-ui'; ctx.textAlign = 'center'; ctx.fillText('ПАУЗА', canvas.width/2, canvas.height/2); }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

document.addEventListener('keydown', e => { keys.add(e.key); if (e.code === 'Space') { e.preventDefault(); fire(); } if (e.key.toLowerCase() === 'p') paused = !paused; });
document.addEventListener('keyup', e => keys.delete(e.key));
startBtn.onclick = startGame;
pauseBtn.onclick = () => paused = !paused;
document.getElementById('fireBtn').onclick = fire;
document.getElementById('leftBtn').ontouchstart = () => keys.add('ArrowLeft');
document.getElementById('leftBtn').ontouchend = () => keys.delete('ArrowLeft');
document.getElementById('rightBtn').ontouchstart = () => keys.add('ArrowRight');
document.getElementById('rightBtn').ontouchend = () => keys.delete('ArrowRight');
document.getElementById('leftBtn').onmousedown = () => keys.add('ArrowLeft');
document.getElementById('leftBtn').onmouseup = () => keys.delete('ArrowLeft');
document.getElementById('rightBtn').onmousedown = () => keys.add('ArrowRight');
document.getElementById('rightBtn').onmouseup = () => keys.delete('ArrowRight');
reset(); draw(); loop();

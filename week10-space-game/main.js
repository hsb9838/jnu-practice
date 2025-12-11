/* =========================================================
   SPACE GAME (Week 11~12 통합 버전)
   - 일반 적 웨이브 → 보스전
   - 풀차징 레이저 (기본 레이저 이미지 사용)
   - 양옆 보조 우주선 자동 공격
   - 쉴드 아이템 드롭 + 일정 시간 무적
   - 점수/라이프/게이지/보스 HP UI
   - Enter 로 재시작
========================================================= */

/* ======================
   1. 이미지 로더
====================== */
function loadTexture(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.error("이미지 로딩 실패:", src, e);
      reject(e);
    };
    img.src = src;
  });
}

/* ======================
   2. 전역 변수
====================== */
let canvas, ctx;

// 이미지 리소스
let heroImg;
let enemyImg;
let bossImg;
let lifeImg;
let laserImg;
let explosionImg;
let supportImg;
let smallLaserImg;
let shieldImg;

// 게임 오브젝트
let hero;
let enemies = [];
let boss = null;
let supportShips = [];
let bullets = [];
let bossBullets = [];
let explosions = [];
let shieldItems = [];

// 게임 상태
let gameOver = false;
let gameWin = false;

// 키 입력 상태
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
};

// 쉴드 상태
let shieldActive = false;
let shieldTimer = 0;
const SHIELD_DURATION = 420; // 프레임 기준(대략 7초)

// 차징/필살기 상태
let isCharging = false;
let chargeStart = 0;
const CHARGE_TIME = 1200;        // 밀리초: 1.2초 이상 누르면 풀차징
let lastUltimateTime = 0;
const ULTIMATE_COOLDOWN = 4000;  // 밀리초: 4초 쿨타임

// 플레이어 이동 속도
const HERO_SPEED = 10;

/* ======================
   3. 유틸 함수
====================== */

// 값 범위 제한
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// 사각형 충돌 판정
function intersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

/* ======================
   4. 기본 클래스들
====================== */

// 화면에 그릴 수 있는 공통 오브젝트
class GameObject {
  constructor(x, y, w, h, img = null) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.img = img;
    this.dead = false;
  }

  draw(ctx) {
    if (this.img) {
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
  }
}

/* -----------------------
   플레이어 우주선
------------------------ */
class Hero extends GameObject {
  constructor(x, y, img) {
    super(x, y, 90, 70, img); // 기본 크기 고정
    this.lives = 3;
    this.score = 0;
    this.lastShot = 0;
  }

  update() {
    // 방향키로 이동
    if (keys.ArrowLeft) this.x -= HERO_SPEED;
    if (keys.ArrowRight) this.x += HERO_SPEED;
    if (keys.ArrowUp) this.y -= HERO_SPEED;
    if (keys.ArrowDown) this.y += HERO_SPEED;

    // 화면 밖으로 못 나가게 제한
    this.x = clamp(this.x, 0, canvas.width - this.width);
    this.y = clamp(this.y, canvas.height / 2, canvas.height - this.height);
  }

  hit() {
    // 쉴드가 켜져 있으면 데미지 무시
    if (!shieldActive) {
      this.lives--;
    }
    if (this.lives <= 0) {
      this.dead = true;
    }
  }

  canFireNormal(now) {
    // 0.2초 이상 지난 경우에만 다시 발사 가능
    return now - this.lastShot > 200;
  }

  fireNormal(now) {
    if (!this.canFireNormal(now)) return;

    const bx = this.x + this.width / 2 - 4;
    const by = this.y - 4;
    bullets.push(new Bullet(bx, by, -18, 1)); // 기본 데미지 1

    this.lastShot = now;
  }
}

/* -----------------------
   일반 UFO 적
------------------------ */
class Enemy extends GameObject {
  constructor(x, y, img) {
    super(x, y, 70, 50, img);
    this.vy = 2;
  }

  update() {
    // 화면 높이의 55% 지점까지 내려오고 멈춤
    const targetY = canvas.height * 0.55;
    if (this.y < targetY) {
      this.y += this.vy;
    }
  }
}

/* -----------------------
   보스 UFO
------------------------ */
class Boss extends GameObject {
  constructor(x, y, img) {
    super(x, y, 220, 130, img);
    this.hp = 80;
    this.dir = 1;  // 좌우 이동 방향
    this.cool = 0; // 공격 쿨타임
  }

  update() {
    // 좌우 왕복 이동 (속도 3)
    this.x += this.dir * 3;
    if (this.x < 10 || this.x + this.width > canvas.width - 10) {
      this.dir *= -1;
    }

    // 탄환 발사
    this.cool--;
    if (this.cool <= 0) {
      const bx = this.x + this.width / 2;
      const by = this.y + this.height;
      bossBullets.push(new Bullet(bx, by, 9, 1)); // 아래로 발사
      this.cool = 25 + Math.random() * 15;
    }
  }

  damage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
    }
  }
}

/* -----------------------
   기본 빨간 레이저 탄환
------------------------ */
class Bullet extends GameObject {
  constructor(x, y, vy, dmg) {
    super(x, y, 8, 24, laserImg);
    this.vy = vy;
    this.damage = dmg;
  }

  update() {
    this.y += this.vy;
    if (this.y < -50 || this.y > canvas.height + 50) {
      this.dead = true;
    }
  }
}

/* -----------------------
   보조 우주선의 작은 초록 레이저
------------------------ */
class SupportLaser extends GameObject {
  constructor(x, y, img) {
    super(x - 3, y, 6, 18, img);
    this.vy = -15;
    this.damage = 1;
  }

  update() {
    this.y += this.vy;
    if (this.y < -50) this.dead = true;
  }
}

/* -----------------------
   풀차징 레이저 (필살기)
   - 기본 레이저 이미지 사용, 크기/데미지만 강화
------------------------ */
class UltimateLaser extends GameObject {
  constructor(x, y, img) {
    super(x - 12, y - 40, 28, 60, img); // 일반 레이저보다 크게
    this.vy = -23;
    this.damage = 40; // 강력한 데미지 (보스 HP 80 기준 2방)
  }

  update() {
    this.y += this.vy;
    if (this.y < -80) this.dead = true;
  }
}

/* -----------------------
   양옆 보조 우주선
------------------------ */
class SupportShip extends GameObject {
  constructor(offsetX, img) {
    super(0, 0, 70, 50, img);
    this.offsetX = offsetX; // 메인 우주선 기준 x 오프셋
    this.cool = 0;          // 자동 발사 쿨타임
  }

  update() {
    // 항상 메인 우주선 양옆에서 따라다님
    this.x = hero.x + this.offsetX;
    this.y = hero.y; // 같은 높이로 맞춤

    this.cool--;
    if (this.cool <= 0) {
      const bx = this.x + this.width / 2;
      const by = this.y - 5;
      bullets.push(new SupportLaser(bx, by, smallLaserImg));
      this.cool = 20; // 발사 간격
    }
  }
}

/* -----------------------
   폭발 이펙트 (레이저 맞았을 때)
------------------------ */
class Explosion extends GameObject {
  constructor(x, y, img) {
    super(x, y, 98, 50, img);
    this.life = 10; // 10프레임 동안 유지
  }

  update() {
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
}

/* -----------------------
   쉴드 아이템
------------------------ */
class ShieldItem extends GameObject {
  constructor(x, y, img) {
    super(x, y, 40, 40, img);
    this.vy = 2;
  }

  update() {
    this.y += this.vy;
    if (this.y > canvas.height + 40) {
      this.dead = true;
    }
  }
}

/* =========================================================
   5. 생성 함수들 (적 웨이브, 보스, 보조기)
========================================================= */

// 일반 적 웨이브 생성
function createEnemies() {
  enemies = [];
  const cols = 6;
  const rows = 4;
  const gapX = 80;
  const gapY = 60;

  const startX = (canvas.width - (cols - 1) * gapX) / 2 - 35;
  const startY = 40;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * gapX;
      const y = startY + r * gapY;
      enemies.push(new Enemy(x, y, enemyImg));
    }
  }
}

// 보스 생성
function spawnBoss() {
  if (!boss) {
    boss = new Boss(canvas.width / 2 - 110, 40, bossImg);
  }
}

// 보조 우주선 2대 생성
function createSupportShips() {
  supportShips = [
    new SupportShip(-130, supportImg), // 왼쪽
    new SupportShip(130, supportImg),  // 오른쪽
  ];
}

/* =========================================================
   6. 게임 초기화
========================================================= */
function initGame() {
  enemies = [];
  boss = null;
  supportShips = [];
  bullets = [];
  bossBullets = [];
  explosions = [];
  shieldItems = [];

  // 메인 우주선 위치: 캔버스 아래쪽 중앙
  const heroWidth = 90;
  const heroHeight = 70;
  const heroX = canvas.width / 2 - heroWidth / 2;
  const heroY = canvas.height - heroHeight - 80;
  hero = new Hero(heroX, heroY, heroImg);

  createEnemies();
  createSupportShips();

  gameOver = false;
  gameWin = false;

  shieldActive = false;
  shieldTimer = 0;

  isCharging = false;
  chargeStart = 0;
}

/* =========================================================
   7. 게임 로직 업데이트
========================================================= */
function update() {
  if (gameOver) return;

  hero.update();
  supportShips.forEach((s) => s.update());
  enemies.forEach((e) => e.update());
  bullets.forEach((b) => b.update());
  bossBullets.forEach((b) => b.update());
  explosions.forEach((e) => e.update());
  shieldItems.forEach((i) => i.update());

  // 1) 플레이어 탄환 vs 일반 적
  bullets.forEach((b) => {
    enemies.forEach((e) => {
      if (b.dead || e.dead) return;
      if (intersect(b, e)) {
        e.dead = true;
        b.dead = true;

        explosions.push(new Explosion(e.x, e.y, explosionImg));
        hero.score += 20 * (b.damage || 1); // 적 처치 시 점수

        // 10% 확률로 쉴드 아이템 드롭
        if (Math.random() < 0.1) {
          shieldItems.push(new ShieldItem(e.x, e.y, shieldImg));
        }
      }
    });
  });

  // 죽은 적 정리
  enemies = enemies.filter((e) => !e.dead);

  // 2) 모든 적 처치 시 보스 등장
  if (enemies.length === 0 && !boss) {
    spawnBoss();
  }

  // 3) 보스 업데이트 및 피격
  if (boss && !boss.dead) {
    boss.update();

    bullets.forEach((b) => {
      if (b.dead) return;
      if (intersect(b, boss)) {
        boss.damage(b.damage || 1);
        b.dead = true;
        explosions.push(new Explosion(boss.x, boss.y, explosionImg));
        hero.score += 10 * (b.damage || 1);
      }
    });
  }

  // 4) 보스 탄환 vs 플레이어
  bossBullets.forEach((b) => {
    if (!b.dead && intersect(b, hero)) {
      b.dead = true;
      hero.hit();
    }
  });

  // 5) 쉴드 아이템 획득 처리
  shieldItems.forEach((item, idx) => {
    if (intersect(hero, item)) {
      shieldActive = true;
      shieldTimer = SHIELD_DURATION;
      item.dead = true;
    }
  });

  // 쉴드 남은 시간 감소
  if (shieldActive) {
    shieldTimer--;
    if (shieldTimer <= 0) {
      shieldActive = false;
    }
  }

  // 6) 죽은 오브젝트 정리
  bullets = bullets.filter((b) => !b.dead);
  bossBullets = bossBullets.filter((b) => !b.dead);
  explosions = explosions.filter((e) => !e.dead);
  shieldItems = shieldItems.filter((i) => !i.dead);

  // 7) 승패 판정
  if (hero.dead) {
    gameOver = true;
    gameWin = false;
  }
  if (boss && boss.dead) {
    gameOver = true;
    gameWin = true;
  }
}

/* =========================================================
   8. 렌더링 (화면 그리기)
========================================================= */
function draw() {
  // 배경
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 점수 (왼쪽 위, 잘 안 잘리게 여백 줌)
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + hero.score, 30, 40);

  // 라이프 (오른쪽 위)
  for (let i = 0; i < hero.lives; i++) {
    ctx.drawImage(lifeImg, canvas.width - 170 + i * 40, 10, 30, 30);
  }

  // 보스 HP 바 (보스가 있을 때만)
  if (boss && !boss.dead) {
    const barW = 300;
    const barH = 18;
    const barX = canvas.width / 2 - barW / 2;
    const barY = 50;

    ctx.strokeStyle = "white";
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = "red";
    ctx.fillRect(barX, barY, (boss.hp / 80) * barW, barH);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOSS HP", canvas.width / 2, barY - 5);
  }

  // 일반 적
  enemies.forEach((e) => e.draw(ctx));

  // 보스
  if (boss && !boss.dead) {
    boss.draw(ctx);
  }

  // 보조 우주선
  supportShips.forEach((s) => s.draw(ctx));

  // 메인 우주선
  hero.draw(ctx);

  // 쉴드 이펙트 (항상 메인 우주선 위에)
  if (shieldActive) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.drawImage(
      shieldImg,
      hero.x - 15,
      hero.y - 20,
      hero.width + 30,
      hero.height + 40
    );
    ctx.restore();
  }

  // 탄환, 폭발, 쉴드 아이템
  bullets.forEach((b) => b.draw(ctx));
  bossBullets.forEach((b) => b.draw(ctx));
  explosions.forEach((e) => e.draw(ctx));
  shieldItems.forEach((i) => i.draw(ctx));

  // 차징 게이지 표시
  const now = Date.now();
  let ratio = 0;
  if (isCharging) {
    ratio = Math.min((now - chargeStart) / CHARGE_TIME, 1);
  }
  const cbW = 220;
  const cbH = 10;
  const cbX = canvas.width / 2 - cbW / 2;
  const cbY = canvas.height - 40;

  ctx.strokeStyle = "white";
  ctx.strokeRect(cbX, cbY, cbW, cbH);
  if (ratio > 0) {
    ctx.fillStyle = "cyan";
    ctx.fillRect(cbX, cbY, cbW * ratio, cbH);
  }

  // 게임 종료 메시지
  if (gameOver) {
    ctx.fillStyle = gameWin ? "yellow" : "red";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      gameWin ? "VICTORY! 엔터를 눌러 재시작" : "GAME OVER... 엔터를 눌러 재시작",
      canvas.width / 2,
      canvas.height / 2
    );
  }
}

/* =========================================================
   9. 메인 루프
========================================================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* =========================================================
   10. 키보드 입력 처리
========================================================= */
function setupControls() {
  window.addEventListener("keydown", (e) => {
    if (e.key.startsWith("Arrow")) {
      keys[e.key] = true;
    }

    // 스페이스: 차징 시작
    if (e.code === "Space" && !isCharging && !gameOver) {
      isCharging = true;
      chargeStart = Date.now();
    }

    // 엔터: 게임 오버 상태에서 재시작
    if (e.key === "Enter" && gameOver) {
      initGame();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key.startsWith("Arrow")) {
      keys[e.key] = false;
    }

    // 스페이스에서 손 뗄 때: 일반 샷 / 필살기 결정
    if (e.code === "Space" && isCharging && !gameOver) {
      isCharging = false;
      const now = Date.now();
      const pressTime = now - chargeStart;

      const canUlt =
        pressTime >= CHARGE_TIME &&
        now - lastUltimateTime >= ULTIMATE_COOLDOWN;

      if (canUlt) {
        // 풀차징 레이저 발사
        bullets.push(
          new UltimateLaser(hero.x + hero.width / 2, hero.y, laserImg)
        );
        lastUltimateTime = now;
      } else {
        // 일반 샷
        hero.fireNormal(now);
      }
    }
  });
}

/* =========================================================
   11. 시작 진입점
========================================================= */
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  // 이미지 로드 (파일 이름/경로는 네 폴더 구조에 맞게 되어 있음)
  heroImg = await loadTexture("assets/png/player.png");
  enemyImg = await loadTexture("assets/png/enemyShip.png");
  bossImg = await loadTexture("assets/png/enemyUFO.png");
  lifeImg = await loadTexture("assets/png/life.png");
  laserImg = await loadTexture("assets/png/laserRed.png");
  explosionImg = await loadTexture("assets/png/laserRedShot.png");
  supportImg = await loadTexture("assets/png/playerLeft.png");
  smallLaserImg = await loadTexture("assets/png/laserGreen.png");
  shieldImg = await loadTexture("assets/png/shield.png");

  setupControls();
  initGame();
  loop();
};

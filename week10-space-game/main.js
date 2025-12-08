// ==================== 유틸: 이미지 로더 ====================
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

// ==================== EventEmitter ====================
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }

  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }

  clear() {
    this.listeners = {};
  }
}

// ==================== 메시지 상수 ====================
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
};

// ==================== 전역 변수 ====================
let heroImg;
let enemyImg;
let lifeImg;
let laserImg;        // 메인 레이저(빨간색)
let smallLaserImg;   // 보조 레이저(초록색)
let supportImg;      // 보조 비행선
let explosionImg;    // 폭발 이미지
let shieldImg;       // 실드 아이템

let canvas;
let ctx;
let gameObjects = [];
let hero;
let supportShips = [];
let shieldItem = null;
let shieldActive = false;
let shieldTimerId = null;
let shieldSpawnId = null;
let gameLoopId = null;
let eventEmitter = new EventEmitter();

// ==================== 기본 GameObject ====================
class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "";
    this.width = 0;
    this.height = 0;
    this.img = undefined;
  }

  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }

  draw(ctx) {
    if (!this.img) return;
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}

// ==================== Hero ====================
class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.speed = { x: 0, y: 0 };
    this.cooldown = 0;
    this.life = 3;
    this.points = 0;
  }

  canFire() {
    return this.cooldown === 0;
  }

  fire() {
    if (this.canFire()) {
      gameObjects.push(new Laser(this.x + 45, this.y - 10));
      this.cooldown = 500;

      let id = setInterval(() => {
        if (this.cooldown > 0) {
          this.cooldown -= 100;
        } else {
          clearInterval(id);
        }
      }, 100);
    }
  }

  decrementLife() {
    this.life--;
    if (this.life <= 0) {
      this.dead = true;
    }
  }

  incrementPoints() {
    this.points += 100;
  }
}

// ==================== Enemy ====================
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";

    const id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y < canvas.height - this.height) {
        this.y += 5;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}

// ==================== 메인 레이저(빨간색) ====================
class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = "Laser";
    this.img = laserImg;

    let id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y > 0) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

// ==================== 보조 레이저(초록색) ====================
class SmallLaser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 5;
    this.height = 20;
    this.type = "SmallLaser";
    this.img = smallLaserImg;

    let id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y > 0) {
        this.y -= 12;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

// ==================== 보조 비행선 ====================
class SupportShip extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 80;
    this.height = 55;
    this.type = "Support";
    this.img = supportImg;

    this.fireTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.fireTimer);
        return;
      }
      gameObjects.push(
        new SmallLaser(this.x + this.width / 2 - 2, this.y - 5)
      );
    }, 700);
  }
}

// ==================== 폭발 ====================
class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Explosion";
    this.img = explosionImg;

    setTimeout(() => {
      this.dead = true;
    }, 300);
  }
}

// ==================== 실드 아이템 ====================
class ShieldItem extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 40;
    this.height = 40;
    this.type = "ShieldItem";
    this.img = shieldImg;

    this.fallTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.fallTimer);
        return;
      }
      this.y += 3;

      if (this.y > canvas.height) {
        this.dead = true;
        clearInterval(this.fallTimer);
      }
    }, 100);
  }
}

// ==================== 키 기본 동작 막기 ====================
let onKeyDown = function (e) {
  switch (e.keyCode) {
    case 37:
    case 38:
    case 39:
    case 40:
    case 32:
      e.preventDefault();
      break;
    default:
      break;
  }
};

window.addEventListener("keydown", onKeyDown);

// ==================== 키 입력 → 메시지 ====================
window.addEventListener("keyup", (evt) => {
  if (evt.key === "ArrowUp") {
    eventEmitter.emit(Messages.KEY_EVENT_UP);
  } else if (evt.key === "ArrowDown") {
    eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  } else if (evt.key === "ArrowLeft") {
    eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  } else if (evt.key === "ArrowRight") {
    eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  } else if (evt.keyCode === 32) {
    eventEmitter.emit(Messages.KEY_EVENT_SPACE);
  } else if (evt.key === "Enter") {
    eventEmitter.emit(Messages.KEY_EVENT_ENTER);
  }
});

// ==================== 생성 함수들 ====================
function createEnemies() {
  const MONSTER_TOTAL = 5;
  const MONSTER_WIDTH = MONSTER_TOTAL * 98;
  const START_X = (canvas.width - MONSTER_WIDTH) / 2;
  const STOP_X = START_X + MONSTER_WIDTH;

  for (let x = START_X; x < STOP_X; x += 98) {
    for (let y = 0; y < 50 * 5; y += 50) {
      const enemy = new Enemy(x, y);
      enemy.img = enemyImg;
      gameObjects.push(enemy);
    }
  }
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

function createSupportShips() {
  supportShips = [];

  const left = new SupportShip(hero.x - 120, hero.y + 30);
  const right = new SupportShip(hero.x + hero.width + 40, hero.y + 30);

  supportShips.push(left, right);
  gameObjects.push(left, right);
}

function spawnShieldItem() {
  if (shieldItem && !shieldItem.dead) return;

  const x = Math.random() * (canvas.width - 50);
  shieldItem = new ShieldItem(x, 0);
  gameObjects.push(shieldItem);
}

// ==================== 보조 함수들 ====================
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

function drawText(message, x, y, color = "red", align = "left") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(message, x, y);
}

function drawPoints() {
  drawText("Points: " + hero.points, 10, canvas.height - 20, "red", "left");
}

function drawLife() {
  const START_POS = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(
      lifeImg,
      START_POS + 45 * (i + 1),
      canvas.height - 37
    );
  }
}

function displayMessage(message, color = "red") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function isHeroDead() {
  return hero.life <= 0;
}

function isEnemiesDead() {
  const enemies = gameObjects.filter(
    (go) => go.type === "Enemy" && !go.dead
  );
  return enemies.length === 0;
}

function activateShield() {
  shieldActive = true;
  if (shieldTimerId) clearTimeout(shieldTimerId);

  shieldTimerId = setTimeout(() => {
    shieldActive = false;
  }, 5000);
}

function endGame(win) {
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
  if (shieldSpawnId) {
    clearInterval(shieldSpawnId);
    shieldSpawnId = null;
  }

  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (win) {
      displayMessage(
        "Victory!!! Pew Pew... - Press [Enter] to start a new game Captain Pew Pew",
        "green"
      );
    } else {
      displayMessage(
        "You died !!! Press [Enter] to start a new game Captain Pew Pew",
        "red"
      );
    }
  }, 200);
}

function resetGame() {
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
  if (shieldSpawnId) {
    clearInterval(shieldSpawnId);
    shieldSpawnId = null;
  }

  eventEmitter.clear();
  initGame();
  startGameLoop();
}

// ==================== 게임 로직 ====================
function updateGameObjects() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy");
  const projectiles = gameObjects.filter(
    (go) => go.type === "Laser" || go.type === "SmallLaser"
  );

  // 레이저-적 충돌
  projectiles.forEach((p) => {
    enemies.forEach((m) => {
      if (intersectRect(p.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
          first: p,
          second: m,
        });
      }
    });
  });

  // Hero-Enemy 충돌
  enemies.forEach((enemy) => {
    const heroRect = hero.rectFromGameObject();
    if (intersectRect(heroRect, enemy.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
    }
  });

  // Hero-실드 아이템 충돌
  if (shieldItem && !shieldItem.dead) {
    const heroRect = hero.rectFromGameObject();
    const itemRect = shieldItem.rectFromGameObject();
    if (intersectRect(heroRect, itemRect)) {
      shieldItem.dead = true;
      activateShield();
    }
  }

  gameObjects = gameObjects.filter((go) => !go.dead);
}

function drawGameObjects() {
  gameObjects.forEach((go) => go.draw(ctx));

  // 실드 활성화 시 히어로 강조 테두리
  if (shieldActive && hero && !hero.dead) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      hero.x - 5,
      hero.y - 5,
      hero.width + 10,
      hero.height + 10
    );
  }
}

// ==================== initGame ====================
function initGame() {
  gameObjects = [];
  supportShips = [];
  shieldItem = null;
  shieldActive = false;

  createEnemies();
  createHero();
  createSupportShips();

  // 키 이벤트 핸들러
  eventEmitter.on(Messages.KEY_EVENT_UP, () => {
    hero.y -= 5;
    supportShips.forEach((s) => (s.y -= 5));
  });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
    hero.y += 5;
    supportShips.forEach((s) => (s.y += 5));
  });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
    hero.x -= 5;
    supportShips.forEach((s) => (s.x -= 5));
  });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
    hero.x += 5;
    supportShips.forEach((s) => (s.x += 5));
  });
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) {
      hero.fire();
    }
  });
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
    resetGame();
  });

  // 충돌 이벤트
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;
    second.dead = true;
    hero.incrementPoints();

    if (isEnemiesDead()) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    enemy.dead = true;

    if (!shieldActive) {
      hero.decrementLife();
    }

    if (isHeroDead()) {
      eventEmitter.emit(Messages.GAME_END_LOSS);
      return;
    }
    if (isEnemiesDead()) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => {
    endGame(true);
  });

  eventEmitter.on(Messages.GAME_END_LOSS, () => {
    endGame(false);
  });

  // 실드 아이템 주기적 생성
  shieldSpawnId = setInterval(() => {
    spawnShieldItem();
  }, 8000);
}

// ==================== 게임 루프 ====================
function startGameLoop() {
  gameLoopId = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPoints();
    drawLife();
    updateGameObjects();
    drawGameObjects();
  }, 100);
}

// ==================== onload ====================
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/png/player.png");
  enemyImg = await loadTexture("assets/png/enemyShip.png");
  lifeImg = await loadTexture("assets/png/life.png");
  laserImg = await loadTexture("assets/png/laserRed.png");
  smallLaserImg = await loadTexture("assets/png/laserGreen.png");
  supportImg = await loadTexture("assets/png/playerLeft.png");
  explosionImg = await loadTexture("assets/png/laserRedShot.png");
  shieldImg = await loadTexture("assets/png/shield.png");

  initGame();
  startGameLoop();
};

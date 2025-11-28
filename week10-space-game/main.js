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
}

// ==================== 메시지 상수 ====================
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
};

// ==================== 전역 변수 ====================
let heroImg;
let enemyImg;
let laserImg;        // 메인 레이저(빨간색)
let smallLaserImg;   // 보조 레이저(초록색)
let supportImg;      // 보조 비행선
let explosionImg;    // 폭발 이미지

let canvas;
let ctx;
let gameObjects = [];
let hero;
let supportShips = []; // 양쪽 보조 비행선 배열
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
    this.cooldown = 0; // 레이저 쿨타임
  }

  canFire() {
    return this.cooldown === 0;
  }

  fire() {
    if (this.canFire()) {
      // 메인 우주선에서 빨간 레이저 발사
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
        console.log("Stopped at", this.y);
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

    // 자동 발사 타이머
    this.fireTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.fireTimer);
        return;
      }
      gameObjects.push(
        new SmallLaser(this.x + this.width / 2 - 2, this.y - 5)
      );
    }, 700); // 0.7초마다 자동 발사
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
    }, 300); // 잠깐만 표시
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
    // 스페이스바
    eventEmitter.emit(Messages.KEY_EVENT_SPACE);
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

  // 왼쪽 보조 비행선
  const left = new SupportShip(
    hero.x - 120,
    hero.y + 30
  );
  // 오른쪽 보조 비행선
  const right = new SupportShip(
    hero.x + hero.width + 40,
    hero.y + 30
  );

  supportShips.push(left, right);
  gameObjects.push(left, right);
}

// ==================== 충돌 체크 ====================
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

function updateGameObjects() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy");
  const projectiles = gameObjects.filter(
    (go) => go.type === "Laser" || go.type === "SmallLaser"
  );

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

  gameObjects = gameObjects.filter((go) => !go.dead);
}

// ==================== 그리기 ====================
function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

// ==================== initGame ====================
function initGame() {
  gameObjects = [];
  supportShips = [];

  createEnemies();
  createHero();
  createSupportShips();

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
    // 여기서 메인 우주선 빨간 레이저 발사
    if (hero.canFire()) {
      hero.fire();
    }
  });

  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;
    second.dead = true;
    gameObjects.push(new Explosion(second.x, second.y));
  });
}

// ==================== 메인: onload ====================
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/png/player.png");
  enemyImg = await loadTexture("assets/png/enemyShip.png");
  laserImg = await loadTexture("assets/png/laserRed.png");
  smallLaserImg = await loadTexture("assets/png/laserGreen.png");
  supportImg = await loadTexture("assets/png/playerLeft.png");
  explosionImg = await loadTexture("assets/png/laserRedShot.png");

  initGame();

  setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGameObjects(ctx);
    updateGameObjects();
  }, 100);
};

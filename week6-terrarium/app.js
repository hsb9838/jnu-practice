// =========================
//  클로저: 더블클릭 시 맨 위로
// =========================
const bringToFront = (() => {
  let maxZ = 10;
  return function (el) {
    el.style.zIndex = ++maxZ;
  };
})();

// =========================
//  Drag and Drop API: 사이드 → 병
// =========================
const terrarium = document.getElementById('terrarium');

// 사이드 패널의 식물들에 draggable 부여 + dragstart 핸들러
document.querySelectorAll('#left-container .plant, #right-container .plant').forEach((img) => {
  img.setAttribute('draggable', 'true');
  img.addEventListener('dragstart', (e) => {
    // 드래그 데이터에 원본 요소 id 저장
    e.dataTransfer.setData('text/plain', img.id);
    e.dataTransfer.effectAllowed = 'copy';
  });
});

// 병 영역의 dragover/drop 처리
terrarium.addEventListener('dragover', (e) => {
  // drop 허용
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

terrarium.addEventListener('drop', (e) => {
  e.preventDefault();

  // 1) 어떤 이미지를 드롭했는지
  const plantId = e.dataTransfer.getData('text/plain');
  const srcEl = document.getElementById(plantId);
  if (!srcEl) return;

  // 2) 병 안에 들어갈 새 이미지 엘리먼트 생성(복제)
  const placed = srcEl.cloneNode(true);
  placed.removeAttribute('id');             // 중복 id 방지
  placed.setAttribute('draggable', 'false'); // 병 안에서는 DnD 비활성(포인터 드래그 사용)
  placed.classList.add('placed');

  // 3) 병 내부 좌표(%) 계산해 배치
  const rect = terrarium.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  placed.style.position = 'absolute';
  placed.style.left = clamp(x, 8, 92) + '%';
  placed.style.top  = clamp(y, 10, 92) + '%';
  placed.style.width = randomRange(18, 30) + '%';
  bringToFront(placed);

  // 4) 병에 추가 + 병 내부에서의 포인터 드래그/더블클릭 설정
  terrarium.appendChild(placed);
  enablePointerDragInsideTerrarium(placed);
  placed.ondblclick = () => bringToFront(placed);
});

// =========================
//  병 안에서 포인터 드래그(미세 이동)
// =========================
function enablePointerDragInsideTerrarium(el) {
  const DRAG_THRESHOLD = 4; // 클릭과 드래그 구분
  let startX = 0, startY = 0;
  let lastX = 0, lastY = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bringToFront(el);

    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    moved = false;

    const onMove = (ev) => {
      const dx0 = ev.clientX - startX;
      const dy0 = ev.clientY - startY;
      if (!moved && Math.hypot(dx0, dy0) >= DRAG_THRESHOLD) moved = true;

      if (moved) {
        const rect = terrarium.getBoundingClientRect();

        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;

        // 현재 위치(px)를 %로 환산하여 업데이트
        const leftPx = el.offsetLeft + dx;
        const topPx  = el.offsetTop  + dy;
        const leftPct = (leftPx / rect.width) * 100;
        const topPct  = (topPx  / rect.height) * 100;

        el.style.left = clamp(leftPct, 5, 95) + '%';
        el.style.top  = clamp(topPct, 8, 95) + '%';
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

// 기존 사이드 이미지가 곧바로 병 안으로 들어가도 동작하도록(마우스로 살짝 끌기만 해도)
document.querySelectorAll('#left-container .plant, #right-container .plant').forEach((img) => {
  // 더블클릭 시 사이드에서 시각 변화가 없어 헷갈릴 수 있으니 병 안에 들어간 후에만 유효
  img.ondblclick = null;
});

// 유틸
function randomRange(min, max) { return Math.round(min + Math.random() * (max - min)); }
function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

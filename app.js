// 클로저를 이용해 "더블클릭 시 맨 위로"를 구현 (요구사항 충족)
const bringToFront = (() => {
  let maxZ = 10;                   // 외부 스코프에 유지되는 상태(클로저)
  return function (el) {
    el.style.zIndex = ++maxZ;      // ondblclick 때 호출
  };
})();

// 모든 plant1~14 요소에 드래그 기능 적용
for (let i = 1; i <= 14; i++) {
  const el = document.getElementById(`plant${i}`);
  if (el) enableDragIntoTerrarium(el);
}

function enableDragIntoTerrarium(el) {
  const terrarium = document.getElementById('terrarium');

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  el.onpointerdown = startDrag;
  el.ondblclick = () => bringToFront(el);   // 클로저 + ondblclick

  function startDrag(e) {
    e.preventDefault();

    // 병 안으로 이동(최초 한 번)
    if (el.parentElement !== terrarium) {
      terrarium.appendChild(el);
      el.style.position = 'absolute';
      bringToFront(el);                      // 위로 올려서 유리보다 앞에 보이도록
      // 포인터 기준으로 병 내부 좌표(%)에 배치
      const rect = terrarium.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.left = clamp(x, 8, 92) + '%';
      el.style.top  = clamp(y, 10, 92) + '%';
      if (!el.style.width) el.style.width = randomRange(18, 30) + '%';
    }

    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onpointermove = onDrag;
    document.onpointerup   = stopDrag;
  }

  function onDrag(e) {
    const rect = terrarium.getBoundingClientRect();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    // px -> % 로 변환하여 업데이트 (반응형에 유리)
    const leftPx = el.offsetLeft - pos1;
    const topPx  = el.offsetTop  - pos2;
    const leftPct = (leftPx / rect.width) * 100;
    const topPct  = (topPx  / rect.height) * 100;

    el.style.left = clamp(leftPct, 5, 95) + '%';
    el.style.top  = clamp(topPct, 8, 95) + '%';
  }

  function stopDrag() {
    document.onpointermove = null;
    document.onpointerup   = null;
  }
}

function randomRange(min, max){ return Math.round(min + Math.random()*(max-min)); }
function clamp(v, a, b){ return Math.min(Math.max(v, a), b); }

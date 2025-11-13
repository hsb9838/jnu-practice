const quotes = [
  'You see, but you do not observe.',
  'There is nothing like first-hand evidence.',
  'The world is full of obvious things.',
  'It is a capital mistake to theorize.',
  'Data, data, data!',
  'I follow my own methods.',
  'My mind rebels at stagnation.'
];
// 상태값
let words = [];
let wordIndex = 0;
let startTime = 0;

// localStorage 최고 기록 키
const BEST_SCORE_KEY = 'typing_best_score';

// localStorage 최고 기록 불러오기
let bestScore = null;
const storedBest = localStorage.getItem(BEST_SCORE_KEY);
if (storedBest !== null) {
  const num = Number(storedBest);
  if (!Number.isNaN(num) && num > 0) {
    bestScore = num;
  }
}

// DOM
const quoteElement = document.getElementById('quote');
const messageElement = document.getElementById('message');
const typedValueElement = document.getElementById('typed-value');
const startBtn = document.getElementById('start');
const resetBtn = document.getElementById('reset');

// 모달 DOM
const modal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultScore = document.getElementById('result-score');
const bestScoreText = document.getElementById('best-score');
const modalClose = document.getElementById('modal-close');

// 모달 닫기
modalClose.addEventListener('click', () => {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  typedValueElement.focus();
});

// 시작 버튼
startBtn.addEventListener('click', () => {
  const quoteIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[quoteIndex];

  words = quote.split(' ');
  wordIndex = 0;

  const spanWords = words.map(w => `<span>${w} </span>`);
  quoteElement.innerHTML = spanWords.join('');
  if (quoteElement.childNodes[0]) {
    quoteElement.childNodes[0].className = 'highlight';
  }

  messageElement.innerText = '';
  typedValueElement.value = '';
  typedValueElement.className = ''; // ok/bad/effect 초기화
  typedValueElement.focus();

  startTime = Date.now();
});

// 입력 처리
typedValueElement.addEventListener('input', () => {
  if (!words.length) return;

  const currentWord = words[wordIndex];
  const typedValue = typedValueElement.value;

  // input 이벤트 시 효과 클래스 부여
  typedValueElement.classList.add('effect');
  setTimeout(() => typedValueElement.classList.remove('effect'), 140);

  // 마지막 단어까지 정확히 입력한 경우
  if (typedValue === currentWord && wordIndex === words.length - 1) {
    const elapsed = (Date.now() - startTime) / 1000;

    // 최고 기록 갱신 (처음이거나, 이전 기록보다 더 빠르면)
    if (bestScore === null || elapsed < bestScore) {
      bestScore = elapsed;
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    }

    // 결과 메시지
    messageElement.innerText = `축하합니다! ${elapsed.toFixed(2)}초 만에 완료했어요.`;

    // 모달에 내용 채우기
    resultTitle.innerText = '클리어! 🎉';
    resultScore.innerText = `이번 기록: ${elapsed.toFixed(2)} 초`;

    if (bestScore !== null) {
      bestScoreText.innerText = `최고 기록: ${bestScore.toFixed(2)} 초`;
    } else {
      bestScoreText.innerText = '첫 도전입니다. 최고 기록을 만들어 보세요!';
    }

    // 모달 표시
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    typedValueElement.className = 'ok';
    return;
  }

  // 단어 정확 + 공백 입력 → 다음 단어로 이동
  if (typedValue.endsWith(' ') && typedValue.trim() === currentWord) {
    typedValueElement.value = '';
    wordIndex++;

    // 하이라이트 이동
    for (const wordEl of quoteElement.childNodes) {
      wordEl.className = '';
    }
    if (quoteElement.childNodes[wordIndex]) {
      quoteElement.childNodes[wordIndex].className = 'highlight';
    }

    // 성공 효과
    typedValueElement.className = 'ok';
    setTimeout(() => typedValueElement.classList.remove('ok'), 150);

    messageElement.innerText = `굿! 남은 단어: ${words.length - wordIndex}`;
    return;
  }

  // 부분 일치
  if (currentWord.startsWith(typedValue)) {
    typedValueElement.classList.remove('bad');
    messageElement.innerText = '';
  } else {
    // 오타
    typedValueElement.classList.add('bad');
    messageElement.innerText = '오타가 있어요. 다시 입력해 보세요.';
  }
});

// 리셋 버튼
resetBtn.addEventListener('click', () => {
  words = [];
  wordIndex = 0;
  startTime = 0;

  quoteElement.innerHTML = '';
  messageElement.innerText = 'start를 눌러 시작하세요.';

  typedValueElement.value = '';
  typedValueElement.className = '';
  typedValueElement.focus();
});

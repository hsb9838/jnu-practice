// 셜록 홈즈 인용문
const quotes = [
  'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.',
  'There is nothing more deceptive than an obvious fact.',
  'I ought to know by this time that when a fact appears to be opposed to a long train of deductions it invariably proves to be capable of bearing some other interpretation.',
  'I never make exceptions. An exception disproves the rule.',
  'What one man can invent another can discover.',
  'Nothing clears up a case so much as stating it to another person.',
  'Education never ends, Watson. It is a series of lessons, with the greatest for the last.'
];

// 상태값
let words = [];
let wordIndex = 0;
let startTime = 0;

// DOM
const quoteElement = document.getElementById('quote');
const messageElement = document.getElementById('message');
const typedValueElement = document.getElementById('typed-value');
const startBtn = document.getElementById('start');
const resetBtn = document.getElementById('reset');

// 시작
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
  typedValueElement.className = ''; // ok/bad 초기화
  typedValueElement.focus();

  startTime = Date.now();
});

// 입력 처리
typedValueElement.addEventListener('input', () => {
  if (!words.length) return;

  const currentWord = words[wordIndex];
  const typedValue = typedValueElement.value;

  // 마지막 단어까지 정확히 입력
  if (typedValue === currentWord && wordIndex === words.length - 1) {
    const elapsed = (Date.now() - startTime) / 1000;
    messageElement.innerText = `축하합니다! ${elapsed.toFixed(2)}초 만에 완료했어요.`;
    typedValueElement.className = 'ok';
    return;
  }

  // 단어 정확 + 공백 → 다음 단어
  if (typedValue.endsWith(' ') && typedValue.trim() === currentWord) {
    typedValueElement.value = '';
    wordIndex++;

    for (const wordEl of quoteElement.childNodes) wordEl.className = '';
    if (quoteElement.childNodes[wordIndex]) {
      quoteElement.childNodes[wordIndex].className = 'highlight';
    }

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

// 리셋
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

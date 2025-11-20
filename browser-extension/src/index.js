/* 강아지 정보 확장 프로그램 */

// DOM 요소 선택
const errors = document.querySelector('.errors');
const loading = document.querySelector('.loading');
const resultDiv = document.querySelector('.result');
const animalContainer = document.querySelector('.animal-container');
const animalImage = document.querySelector('.animal-image');
const refreshAnimalBtn = document.querySelector('.refresh-animal-btn');
const breedName = document.querySelector('.breed-name');
const currentDate = document.querySelector('.current-date');
const dailyQuote = document.querySelector('.daily-quote');

// 오늘의 명언 목록
const quotes = [
    "강아지는 인간의 가장 좋은 친구입니다.",
    "작은 발걸음이 큰 변화를 만듭니다.",
    "오늘 하루도 화이팅!",
    "작은 행동이 큰 차이를 만듭니다.",
    "긍정적인 마음가짐이 하루를 밝게 만듭니다.",
    "강아지처럼 순수한 마음으로 하루를 시작해보세요.",
    "작은 것에 감사하는 마음을 가지세요.",
    "오늘도 좋은 하루 되세요!"
];

// 날짜 표시 함수
function displayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[today.getDay()];
    
    if (currentDate) {
        currentDate.textContent = `${year}년 ${month}월 ${day}일 ${weekday}`;
    }
}

// 오늘의 명언 표시 함수
function displayQuote() {
    if (dailyQuote) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        dailyQuote.textContent = randomQuote;
    }
}

// 강아지 품종 추출 함수 (URL에서)
function extractBreedFromUrl(url) {
    try {
        // URL 예: https://images.dog.ceo/breeds/husky/n02110185_1469.jpg
        const match = url.match(/breeds\/([^\/]+)/);
        if (match && match[1]) {
            // 품종 이름을 보기 좋게 변환 (예: "husky" -> "허스키")
            const breed = match[1];
            // 하이픈으로 구분된 경우 처리 (예: "german-shepherd" -> "German Shepherd")
            return breed
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return '알 수 없음';
    } catch (error) {
        return '알 수 없음';
    }
}

// 강아지 정보 가져오기 함수
async function fetchRandomDog() {
    try {
        loading.style.display = 'block';
        errors.textContent = '';
        
        const response = await fetch('https://dog.ceo/api/breeds/image/random');
        
        if (!response.ok) {
            throw new Error(`강아지 API 요청 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 강아지 이미지 표시
        if (animalImage && data.message) {
            animalImage.src = data.message;
            animalImage.style.display = 'block';
            
            // 품종 정보 추출 및 표시
            const breed = extractBreedFromUrl(data.message);
            if (breedName) {
                breedName.textContent = breed;
            }
        }
        
        // 컨테이너 표시
        if (animalContainer) {
            animalContainer.style.display = 'block';
        }
        
        loading.style.display = 'none';
        
    } catch (error) {
        console.error('강아지 정보 가져오기 오류:', error);
        loading.style.display = 'none';
        errors.style.display = 'block';
        errors.textContent = '강아지 정보를 가져올 수 없습니다. 나중에 다시 시도해주세요.';
        
        if (animalContainer) {
            animalContainer.style.display = 'block';
        }
    }
}

// 초기화 함수
function init() {
    resultDiv.style.display = 'block';
    loading.style.display = 'block';
    errors.style.display = 'none';
    
    // 날짜와 명언 표시
    displayDate();
    displayQuote();
    
    // 강아지 정보 가져오기
    fetchRandomDog();
}

// 새로고침 버튼 리스너
if (refreshAnimalBtn) {
    refreshAnimalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fetchRandomDog();
        // 명언도 새로고침할 때마다 변경
        displayQuote();
    });
}

// 초기화 실행
init();
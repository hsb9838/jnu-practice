/* src/index.js (9주차 3부, 4부 수정 완료) */

// 1. DOM 요소 잡기 (기존과 동일)
const form = document.querySelector('.form-data');
const region = document.querySelector('.region-name');
const apiKey = document.querySelector('.api-key');
const errors = document.querySelector('.errors');
const loading = document.querySelector('.loading');
const resultsContainer = document.querySelector('.result-container');
const resultDiv = document.querySelector('.result'); 
const usage = document.querySelector('.carbon-usage');
const fossilfuel = document.querySelector('.fossil-fuel');
const myregion = document.querySelector('.my-region');
const clearBtn = document.querySelector('.clear-btn');

// 2. [9주차 4부] calculateColor 함수 추가 
const calculateColor = (value) => {
    let co2Scale = [0, 150, 600, 750, 800];
    let colors = ['#2AA364', '#F5EB4D', '#9E4229', '#381D02', '#381D02'];

    let closestNum = co2Scale.sort((a, b) => {
        return Math.abs(a - value) - Math.abs(b - value);
    })[0];
    
    let num = (element) => element > closestNum;
    let scaleIndex = co2Scale.findIndex(num);

    let closestColor = colors[scaleIndex];
    
    // background.js로 메시지 전송
    chrome.runtime.sendMessage({ action: 'updateIcon', value: { color: closestColor } });
};

// 3. [9주차 3부] displayCarbonUsage 함수 (fetch 버전으로 수정)
async function displayCarbonUsage(apiKey, region) {
    try {
        // 교수님이 주신 fetch 코드를 기반으로 URL 수정
        const response = await fetch(`https://api.electricitymaps.com/v3/carbon-intensity/latest?zone=${region}`, {
            method: 'GET',
            headers: {
                'auth-token': apiKey
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        let carbonIntensity = Math.round(data.carbonIntensity);

        // [9주차 4부] calculateColor 함수 호출 
        calculateColor(carbonIntensity);

        // 성공: 결과창 보여주기
        loading.style.display = 'none';
        resultsContainer.style.display = 'block';
        errors.textContent = '';

        myregion.textContent = region;
        usage.textContent = `${carbonIntensity} grams (grams CO₂ emitted per kilowatt hour)`;
        
        if (data.fossilFuelPercentage) {
            fossilfuel.textContent = data.fossilFuelPercentage.toFixed(2) + '% (percentage of fossil fuels used to generate electricity)';
        } else {
            fossilfuel.textContent = ''; // 시안대로 빈 칸 처리
        }
        
    } catch (error) {
        // 실패: 에러창 보여주기
        console.error('Error fetching carbon data:', error);
        loading.style.display = 'none';
        resultsContainer.style.display = 'none';
        errors.style.display = 'block';
        errors.textContent = 'Sorry, we couldn\'t fetch data for that region.';
        
        form.style.display = 'block';
        clearBtn.style.display = 'none';
        resultDiv.style.display = 'none';
        
        localStorage.removeItem('apiKey');
        localStorage.removeItem('regionName');
    }
}

// 4. [9주차 4부] init 함수 (아이콘 초기화 코드 추가)
function init() {
    const storedApiKey = localStorage.getItem('apiKey');
    const storedRegion = localStorage.getItem('regionName');

    // [9주차 4부] 아이콘을 'green'으로 초기화 
    chrome.runtime.sendMessage({
        action: 'updateIcon',
        value: {
            color: 'green',
        },
    });

    if (storedApiKey === null || storedRegion === null) {
        form.style.display = 'block';
        resultDiv.style.display = 'none';
        loading.style.display = 'none';
        clearBtn.style.display = 'none';
        errors.textContent = '';
    } else {
        // (로딩 버그 수정된 버전)
        form.style.display = 'none';
        resultDiv.style.display = 'block';
        loading.style.display = 'block';
        resultsContainer.style.display = 'none';
        clearBtn.style.display = 'block';
        
        displayCarbonUsage(storedApiKey, storedRegion); 
    }
}

// 5. handleSubmit, setUpUser, reset 함수 (기존과 동일)
function handleSubmit(e) {
    e.preventDefault();
    setUpUser(apiKey.value, region.value);
}

function setUpUser(apiKey, regionName) {
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('regionName', regionName);
    
    form.style.display = 'none';
    resultDiv.style.display = 'block';
    loading.style.display = 'block';
    resultsContainer.style.display = 'none';
    errors.textContent = '';
    clearBtn.style.display = 'block';

    displayCarbonUsage(apiKey, regionName);
}

function reset(e) {
    e.preventDefault();
    localStorage.removeItem('regionName');
    localStorage.removeItem('apiKey');
    init();
}

// 6. 리스너 추가 (기존과 동일)
form.addEventListener('submit', (e) => handleSubmit(e));
clearBtn.addEventListener('click', (e) => reset(e));
init();
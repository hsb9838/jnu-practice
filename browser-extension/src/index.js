import axios from 'axios';

// elements
const form = document.querySelector('.form-data');
const region = document.querySelector('.region-name');
const apiKey = document.querySelector('.api-key');

const errors = document.querySelector('.errors');
const loading = document.querySelector('.loading');
const results = document.querySelector('.result-container');
const usage = document.querySelector('.carbon-usage');
const fossilfuel = document.querySelector('.fossil-fuel');
const myregion = document.querySelector('.my-region');
const clearBtn = document.querySelector('.clear-btn');

form.addEventListener('submit', (e) => handleSubmit(e));
clearBtn.addEventListener('click', (e) => reset(e));
init();

function reset(e){
  e.preventDefault();
  localStorage.removeItem('regionName');
  localStorage.removeItem('apiKey');
  init();
}

function init(){
  const storedApiKey = localStorage.getItem('apiKey');
  const storedRegion = localStorage.getItem('regionName');

  if (!storedApiKey || !storedRegion) {
    form.style.display = 'block';
    results.style.display = 'none';
    loading.style.display = 'none';
    clearBtn.style.display = 'none';
    errors.textContent = '';
  } else {
    form.style.display = 'none';
    clearBtn.style.display = 'block';
    displayCarbonUsage(storedApiKey, storedRegion);
  }
}

function handleSubmit(e){
  e.preventDefault();
  const key = apiKey.value.trim();
  const regionName = region.value.trim();
  if (!key || !regionName){
    errors.textContent = 'API Key와 Region을 입력하세요.';
    return;
  }
  setUpUser(key, regionName);
}

function setUpUser(key, regionName){
  localStorage.setItem('apiKey', key);
  localStorage.setItem('regionName', regionName);
  errors.textContent = '';
  loading.style.display = 'block';
  clearBtn.style.display = 'block';
  displayCarbonUsage(key, regionName);
}

async function displayCarbonUsage(key, regionName){
  try{
    loading.style.display = 'block';
    errors.textContent = '';
    results.style.display = 'none';

    // 예시 API (ElectricityMap) — 실제 키와 zone 필요
    const url = `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${encodeURIComponent(regionName)}`;
    const { data } = await axios.get(url, { headers: { 'auth-token': key }});

    myregion.textContent = data.zone || regionName;
    usage.textContent = (data.carbonIntensity ?? 'N/A') + ' gCO₂/kWh';
    fossilfuel.textContent = (data.fossilFuelPercentage ?? 'N/A') + ' %';

    results.style.display = 'block';
  } catch(err){
    console.error(err);
    errors.textContent = '데이터를 가져오지 못했습니다. API Key 또는 Region을 확인하세요.';
  } finally{
    loading.style.display = 'none';
  }
}

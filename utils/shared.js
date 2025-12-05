// utils/shared.js

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const WEATHER_MAP_ZH = {
  0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
  45: '雾', 48: '白霜', 51: '毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨',
  71: '小雪', 73: '中雪', 75: '大雪', 80: '阵雨', 95: '雷阵雨',
  'clear': '晴', 'mcloudy': '多云', 'cloudy': '阴', 'rain': '雨', 
  'snow': '雪', 'ts': '雷暴', 'lightrain': '小雨', 
  'oshower': '阵雨', 'ishower': '阵雨', 'lightsnow': '小雪', 'rainsnow': '雨夹雪'
};

export const WEATHER_MAP_EN = {
  0: 'Clear', 1: 'Partly Cloudy', 2: 'Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime Fog', 51: 'Light Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Showers', 95: 'Thunderstorm',
  'clear': 'Clear', 'mcloudy': 'Partly Cloudy', 'cloudy': 'Cloudy', 'rain': 'Rain', 
  'snow': 'Snow', 'ts': 'Thunderstorm', 'lightrain': 'Light Rain', 
  'oshower': 'Showers', 'ishower': 'Showers', 'lightsnow': 'Light Snow', 'rainsnow': 'Sleet'
};

export function generateRandomIP() {
  const segments = [[110, 125], [116, 124], [220, 223], [180, 183], [218, 220]];
  const segment = segments[Math.floor(Math.random() * segments.length)];
  const first = Math.floor(Math.random() * (segment[1] - segment[0] + 1)) + segment[0];
  return `${first}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}`;
}

export async function fetchWithFakeHeaders(url, extraOptions = {}) {
  const fakeIp = generateRandomIP();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Forwarded-For': fakeIp,
    'X-Real-IP': fakeIp,
    'Client-IP': fakeIp
  };
  
  return fetch(url, { headers, ...extraOptions });
}

export function kmhToScale(kmh, lang = 'zh') {
  const speed = parseFloat(kmh);
  if (lang === 'en') return `${speed} km/h`;

  if (speed < 1) return '0级';
  if (speed < 6) return '1级';
  if (speed < 12) return '2级';
  if (speed < 20) return '3级';
  if (speed < 29) return '4级';
  if (speed < 39) return '5级';
  if (speed < 50) return '6级';
  if (speed < 62) return '7级';
  if (speed < 75) return '8级';
  return '9级+';
}

export function degreesToDir(deg, lang = 'zh') {
  const directionsZh = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  const directionsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return lang === 'en' ? directionsEn[index] : directionsZh[index];
}

export async function getCoordsByCity(city) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetchWithFakeHeaders(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].latitude,
          lon: data.results[0].longitude
        };
      }
    }
  } catch (e) {}
  return null;
}
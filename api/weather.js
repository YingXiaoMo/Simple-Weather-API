// api/weather.js - Vercel 

export const config = {
  runtime: 'edge',
};

function generateRandomIP() {
  const segments = [[110, 125], [116, 124], [220, 223], [180, 183], [218, 220]];
  const segment = segments[Math.floor(Math.random() * segments.length)];
  const first = Math.floor(Math.random() * (segment[1] - segment[0] + 1)) + segment[0];
  return `${first}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}`;
}

async function fetchWithFakeHeaders(url) {
  const fakeIp = generateRandomIP();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Forwarded-For': fakeIp,
    'X-Real-IP': fakeIp,
    'Client-IP': fakeIp
  };
  return fetch(url, { headers });
}

function kmhToScale(kmh) {
  const speed = parseFloat(kmh);
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

function degreesToDir(deg) {
  const directions = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

async function getCoordsByCity(city) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`;
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

export default async function handler(request) {
  const url = new URL(request.url);
  let lat = url.searchParams.get('lat');
  let lon = url.searchParams.get('lon');
  const city = url.searchParams.get('city');

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if ((!lat || !lon) && city) {
    const coords = await getCoordsByCity(city);
    if (coords) {
      lat = coords.lat;
      lon = coords.lon;
    }
  }

  const WEATHER_MAP = {
    0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
    45: '雾', 48: '白霜', 51: '毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨',
    71: '小雪', 73: '中雪', 75: '大雪', 80: '阵雨', 95: '雷阵雨',
    'clear': '晴', 'mcloudy': '多云', 'cloudy': '阴', 'rain': '雨', 
    'snow': '雪', 'ts': '雷暴', 'lightrain': '小雨', 
    'oshower': '阵雨', 'ishower': '阵雨', 'lightsnow': '小雪', 'rainsnow': '雨夹雪'
  };

  let weatherData = null;
  let source = '';
  let debugLog = [];

  if (lat && lon) {
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
      const res = await fetchWithFakeHeaders(omUrl);
      if (res.ok) {
        const data = await res.json();
        const cur = data.current;
        weatherData = {
          weather: WEATHER_MAP[cur.weather_code] || '未知',
          temp: Math.round(cur.temperature_2m),
          wind: `${degreesToDir(cur.wind_direction_10m)} ${kmhToScale(cur.wind_speed_10m)}`
        };
        source = 'OpenMeteo';
      } else { debugLog.push(`OpenMeteo Error: ${res.status}`); }
    } catch (e) { debugLog.push(`OpenMeteo Exception: ${e.message}`); }
  }

  if (!weatherData && lat && lon) {
    try {
      const stUrl = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`;
      const res = await fetchWithFakeHeaders(stUrl);
      if (res.ok) {
        const data = await res.json();
        const cur = data.dataseries && data.dataseries[0];
        if (cur) {
          weatherData = {
            weather: WEATHER_MAP[cur.weather] || '多云',
            temp: cur.temp2m,
            wind: `${cur.wind10m.speed}级` 
          };
          source = '7Timer';
        }
      } else { debugLog.push(`7Timer Error: ${res.status}`); }
    } catch (e) { debugLog.push(`7Timer Exception: ${e.message}`); }
  }

  if (!weatherData) {
    try {
      const query = (lat && lon) ? `${lat},${lon}` : city;
      if (query) {
        const wttrUrl = `https://wttr.in/${encodeURIComponent(query)}?format=j1&lang=zh`;
        const res = await fetchWithFakeHeaders(wttrUrl);
        if (res.ok) {
          const data = await res.json();
          const cur = data.current_condition[0];
          const desc = cur.lang_zh ? cur.lang_zh[0].value : (cur.weatherDesc[0].value || '多云');
          weatherData = {
            weather: desc,
            temp: cur.temp_C,
            wind: `${degreesToDir(cur.winddirDegree)} ${kmhToScale(cur.windspeedKmph)}`
          };
          source = 'Wttr.in';
        } else { debugLog.push(`Wttr Error: ${res.status}`); }
      }
    } catch (e) { debugLog.push(`Wttr Exception: ${e.message}`); }
  }

  if (weatherData) {
    return new Response(JSON.stringify({
      status: 'ok',
      data: weatherData,
      source: source,
      debug_info: source !== 'OpenMeteo' ? debugLog : undefined
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=60"
      }
    });
  } else {
    return new Response(JSON.stringify({ status: 'error', debug_log: debugLog }), { status: 500, headers: corsHeaders });
  }
}
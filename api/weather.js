// api/weather.js - Vercel 
import { 
  corsHeaders, 
  WEATHER_MAP_ZH, 
  WEATHER_MAP_EN, 
  fetchWithFakeHeaders, 
  kmhToScale, 
  degreesToDir, 
  getCoordsByCity 
} from '../utils/shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  let lat = url.searchParams.get('lat');
  let lon = url.searchParams.get('lon');
  const city = url.searchParams.get('city');
  const lang = url.searchParams.get('lang') || 'zh';

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

  const WEATHER_MAP = lang === 'en' ? WEATHER_MAP_EN : WEATHER_MAP_ZH;
  let weatherData = null;
  let source = '';
  let debugLog = [];

  // Plan A: OpenMeteo
  if (lat && lon) {
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
      const res = await fetchWithFakeHeaders(omUrl);
      
      if (res.ok) {
        const data = await res.json();
        const cur = data.current;
        weatherData = {
          weather: WEATHER_MAP[cur.weather_code] || (lang === 'en' ? 'Unknown' : '未知'),
          temp: Math.round(cur.temperature_2m),
          wind: `${degreesToDir(cur.wind_direction_10m, lang)} ${kmhToScale(cur.wind_speed_10m, lang)}`
        };
        source = 'OpenMeteo';
      } else { debugLog.push(`OpenMeteo Error: ${res.status}`); }
    } catch (e) { debugLog.push(`OpenMeteo Exception: ${e.message}`); }
  }

  // Plan B: 7Timer
  if (!weatherData && lat && lon) {
    try {
      const stUrl = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`;
      const res = await fetchWithFakeHeaders(stUrl);
      
      if (res.ok) {
        const data = await res.json();
        const cur = data.dataseries && data.dataseries[0];
        if (cur) {
          weatherData = {
            weather: WEATHER_MAP[cur.weather] || (lang === 'en' ? 'Cloudy' : '多云'),
            temp: cur.temp2m,
            wind: lang === 'en' ? `Level ${cur.wind10m.speed}` : `${cur.wind10m.speed}级` 
          };
          source = '7Timer';
        }
      } else { debugLog.push(`7Timer Error: ${res.status}`); }
    } catch (e) { debugLog.push(`7Timer Exception: ${e.message}`); }
  }

  // Plan C: Wttr.in
  if (!weatherData) {
    try {
      const query = (lat && lon) ? `${lat},${lon}` : city;
      if (query) {
        const wttrLang = lang === 'en' ? 'en' : 'zh';
        const wttrUrl = `https://wttr.in/${encodeURIComponent(query)}?format=j1&lang=${wttrLang}`;
        const res = await fetchWithFakeHeaders(wttrUrl);
        
        if (res.ok) {
          const data = await res.json();
          const cur = data.current_condition[0];
          
          let desc = 'Unknown';
          if (lang === 'en') {
              desc = cur.weatherDesc ? cur.weatherDesc[0].value : 'Cloudy';
          } else {
              desc = cur.lang_zh ? cur.lang_zh[0].value : (cur.weatherDesc[0].value || '多云');
          }

          weatherData = {
            weather: desc,
            temp: cur.temp_C,
            wind: `${degreesToDir(cur.winddirDegree, lang)} ${kmhToScale(cur.windspeedKmph, lang)}`
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
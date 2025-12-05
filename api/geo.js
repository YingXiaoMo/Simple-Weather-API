// api/geo.js

import cityMap from '../cityMap.json';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') || 'zh'; 

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cityHeader = request.headers.get("x-vercel-ip-city");
  const cityEn = cityHeader ? decodeURIComponent(cityHeader) : "Unknown";
  
  const country = request.headers.get("x-vercel-ip-country") || "Unknown";
  const lat = request.headers.get("x-vercel-ip-latitude");
  const lon = request.headers.get("x-vercel-ip-longitude");
  const ip = request.headers.get("x-forwarded-for") || '127.0.0.1';

  const isIPv6 = ip.includes(':');
  const networkType = isIPv6 ? 'IPv6' : 'IPv4';

  let finalCity = cityEn;

  const cleanName = (name) => {
    if (!name) return "";
    return name.replace(/ (City|Shi|District|Region|Municipality)$/i, '').trim();
  };

  if (lang !== 'en') {
    if (cityMap[cityEn]) {
      finalCity = cityMap[cityEn];
    } 
    else if (cityMap[cleanName(cityEn)]) {
      finalCity = cityMap[cleanName(cityEn)];
    }
    else if (cityEn === "Xi'an" && cityMap["Xi’an"]) {
       finalCity = cityMap["Xi’an"];
    }
  }

  return new Response(JSON.stringify({
    ip: ip,
    type: networkType, 
    city: finalCity, 
    city_en: cityEn,
    country: country,
    latitude: lat,
    longitude: lon,
    source: "Vercel Edge (Local Map)"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json;charset=UTF-8" }
  });
}
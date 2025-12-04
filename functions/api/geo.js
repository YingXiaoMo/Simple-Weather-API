// functions/api/geo.js

import cityMap from '../../cityMap.json';

export async function onRequest(context) {
  const { request } = context;
  const clientIP = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const providers = [
    {
      name: "ip-api.com",
      url: (ip) => `http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,message,country,city,lat,lon`,
      timeout: 1200,
      parser: (data) => {
        if (data.status !== 'success') throw new Error(data.message);
        return { city: data.city, country: data.country, lat: data.lat, lon: data.lon };
      }
    },
    {
      name: "ipapi.co",
      url: (ip) => `https://ipapi.co/${ip}/json/`,
      timeout: 2000,
      parser: (data) => {
        if (data.error) throw new Error(data.reason);
        return { city: data.city, country: data.country_name, lat: data.latitude, lon: data.longitude };
      }
    },
    {
      name: "IpWho",
      url: (ip) => `https://ipwho.is/${ip}?lang=zh-CN`,
      timeout: 1500,
      parser: (data) => {
        if (!data.success) throw new Error(data.message);
        return { city: data.city, country: data.country, lat: data.latitude, lon: data.longitude };
      }
    },
    {
      name: "FreeIPAPI",
      url: (ip) => `https://freeipapi.com/api/json/${ip}`,
      timeout: 1500,
      parser: (data) => {
        if (!data.cityName) throw new Error("Invalid Data");
        return { city: data.cityName, country: data.countryName, lat: data.latitude, lon: data.longitude };
      }
    },
    {
      name: "Geoapi.info",
      url: (ip) => `https://geoapi.info/api/ip/${ip}`,
      timeout: 2000,
      parser: (data) => {
        if (!data.city) throw new Error("Invalid Data");
        return { city: data.city, country: data.country, lat: data.latitude, lon: data.longitude };
      }
    }
  ];

  let geoData = null;
  let successSource = "";

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), provider.timeout);
      const res = await fetch(provider.url(clientIP), {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; SimpleWeatherAPI/1.0)' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const rawData = await res.json();
        geoData = provider.parser(rawData);
        successSource = provider.name;
        break;
      }
    } catch (e) {
      continue;
    }
  }


  if (!geoData) {
    const cf = request.cf || {};
    geoData = {
      city: cf.city || "Unknown",
      country: cf.country || "Unknown",
      lat: cf.latitude,
      lon: cf.longitude
    };
    successSource = "Cloudflare (Fallback)";
  }

  let finalCity = geoData.city;
  const rawCity = geoData.city;

  const cleanName = (name) => {
    if (!name) return "";
    return name.replace(/ (City|Shi|District|Region|Municipality)$/i, '').trim();
  };

  if (cityMap[finalCity]) {
    finalCity = cityMap[finalCity];
  } else if (cityMap[cleanName(finalCity)]) {
    finalCity = cityMap[cleanName(finalCity)];
  } else if (finalCity === "Xi'an" && cityMap["Xi’an"]) {
     finalCity = cityMap["Xi’an"];
  }

  const isIPv6 = clientIP.includes(':');
  
  return new Response(JSON.stringify({
    ip: clientIP,
    type: isIPv6 ? 'IPv6' : 'IPv4', 
    city: finalCity,
    city_en: rawCity,
    country: geoData.country,
    latitude: geoData.lat,
    longitude: geoData.lon,
    source: `${successSource} + Local Map`
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json;charset=UTF-8" }
  });
}
import fetch from "node-fetch";

const BASE = "https://us.api.iheart.com/api/v2";
const RADIO_BROWSER_API_BASE = "https://de1.api.radio-browser.info/json/stations";

async function getRadioBrowserStreams(name) {
  try {
    const res = await fetch(`${RADIO_BROWSER_API_BASE}/byname/${encodeURIComponent(name)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 5).map((s, i) => ({
      title: `RadioBrowser Source ${i + 1} (${s.codec || 'MP3'})`,
      url: s.url_resolved || s.url
    })).filter(s => s.url);
  } catch (e) {
    console.error("RadioBrowser fetch error:", e);
    return [];
  }
}

async function getInternationalStations(limit = 1000) {
  try {
    const res = await fetch(`${RADIO_BROWSER_API_BASE}/topvote/${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(s => ({
      id: s.stationuuid,
      name: s.name,
      logo: s.favicon,
      streams: [{ title: `Community Stream (${s.codec})`, url: s.url_resolved || s.url }],
      streamUrl: s.url_resolved || s.url,
      isInternational: true
    })).filter(s => s.streamUrl);
  } catch (e) {
    console.error("International fetch error:", e);
    return [];
  }
}

function extractStreams(station) {
  if (!station) return [];
  
  let results = [];
  
  if (station.streams) {
    const s = station.streams;
    const formats = [
      { name: "HLS (Secure)", url: s.secure_hls_stream },
      { name: "HLS", url: s.hls_stream },
      { name: "PLS (Secure)", url: s.secure_pls_stream },
      { name: "PLS", url: s.pls_stream },
      { name: "Shoutcast (Secure)", url: s.secure_shoutcast_stream },
      { name: "Shoutcast", url: s.shoutcast_stream },
      { name: "ST Stream", url: s.st_stream },
      { name: "RTMP (Secure)", url: s.secure_rtmp_stream },
      { name: "RTMP", url: s.rtmp_stream },
      { name: "Primary", url: s.primary }
    ];
    
    results = formats
      .filter(f => f.url && f.url.length > 0)
      .map(f => ({ title: f.name, url: f.url }));
  }

  // Add highly stable Direct revma sources
  if (station.id) {
    results.push({ 
      title: "Direct HLS (High Priority)", 
      url: `https://stream.revma.ihrhls.com/zc${station.id}/hls.m3u8?p=stremio&ls=1` 
    });
    
    results.push({ 
      title: "CDN Alternative (Secure)", 
      url: `https://icecast.ihrhls.com/zc${station.id}_low_sec` 
    });

    if (station.callLetters) {
      const callLetters = station.callLetters.toLowerCase();
      results.push({
        title: "Station Web Direct (HLS)",
        url: `https://stream.revma.ihrhls.com/zc${callLetters}/hls.m3u8?p=stremio&ls=1`
      });
      results.push({
        title: "Station Web Direct (Alternative)",
        url: `https://icecast.ihrhls.com/${callLetters}.m3u8`
      });
    }

    // External Player Sources as a last resort
    results.push({
      title: "External Player (iHeartRadio)",
      url: `https://www.iheart.com/live/${station.id}/`
    });
    
    if (station.callLetters) {
      results.push({
        title: "External Player (Web)",
        url: `https://www.radio.net/s/${station.callLetters.toLowerCase()}`
      });
    }
  }

  const seen = new Set();
  return results.filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export async function searchStations(query, limit = 10000) {
  const url = `${BASE}/search/all?keywords=${encodeURIComponent(query)}&limit=${limit}&bundle=true&include_streams=true`;
  try {
    const [iheartRes, rbRes] = await Promise.all([
      fetch(url),
      fetch(`${RADIO_BROWSER_API_BASE}/byname/${encodeURIComponent(query)}?limit=100`)
    ]);

    const iheartData = iheartRes.ok ? await iheartRes.json() : { stations: [] };
    const rbData = rbRes.ok ? await rbRes.json() : [];

    const iheartStations = (iheartData?.stations || []).concat(iheartData?.results || []).map(station => {
      const streams = extractStreams(station);
      return {
        id: station.id,
        name: station.name,
        logo: station.logo || station.image,
        streams: streams,
        streamUrl: streams[0]?.url || null
      };
    });

    const rbStations = rbData.map(s => ({
      id: s.stationuuid,
      name: s.name,
      logo: s.favicon,
      streams: [{ title: `Community Stream (${s.codec})`, url: s.url_resolved || s.url }],
      streamUrl: s.url_resolved || s.url
    }));

    return [...iheartStations, ...rbStations].filter(s => s.streamUrl && s.streams.length > 0);
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
}

export async function getTopStations(limit = 10000) {
  const url = `${BASE}/content/liveStations?limit=${limit}&bundle=true&include_streams=true`;
  try {
    const [iheartRes, internationalStations] = await Promise.all([
      fetch(url),
      getInternationalStations(500)
    ]);

    const iheartData = iheartRes.ok ? await iheartRes.json() : { hits: [] };
    const iheartStations = (iheartData?.hits || iheartData?.results || []).map(station => {
      const streams = extractStreams(station);
      return {
        id: station.id,
        name: station.name,
        logo: station.logo || station.image,
        streams: streams,
        streamUrl: streams[0]?.url || null
      };
    });

    return [...iheartStations, ...internationalStations].filter(s => s.streamUrl && s.streams.length > 0);
  } catch (e) {
    console.error("Top stations error:", e);
    return [];
  }
}

export async function getStation(id) {
  if (id.includes('-') && id.length > 20) {
    try {
      const res = await fetch(`${RADIO_BROWSER_API_BASE}/byuuid/${id}`);
      if (res.ok) {
        const data = await res.json();
        const s = data[0];
        if (s) {
          const streams = [{ title: `Community Stream (${s.codec})`, url: s.url_resolved || s.url }];
          streams.push({ title: "External Player (RadioBrowser)", url: `https://www.radio-browser.info/history/${s.stationuuid}` });
          return {
            id: s.stationuuid,
            name: s.name,
            logo: s.favicon,
            streams: streams,
            streamUrl: streams[0]?.url || null
          };
        }
      }
    } catch (e) {
      console.error("RB direct fetch error:", e);
    }
  }

  try {
    const searchUrl = `${BASE}/search/all?keywords=${id}&limit=1&bundle=true&include_streams=true`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const stations = (searchData?.stations || []).concat(searchData?.results || []);
      const station = stations.find(s => s.id == id);
      if (station) {
        const streams = extractStreams(station);
        const rbStreams = await getRadioBrowserStreams(station.name);
        const allStreams = [...streams, ...rbStreams];
        return {
          id: station.id,
          name: station.name,
          logo: station.logo || station.image,
          streams: allStreams,
          streamUrl: allStreams[0]?.url || null
        };
      }
    }
  } catch (e) {
    console.warn("Search lookup failed, falling back to content API");
  }

  try {
    const url = `${BASE}/content/liveStations/${id}?bundle=true&include_streams=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const station = data?.hits?.[0] || data?.results?.[0] || data;
    const streams = extractStreams(station);
    const rbStreams = await getRadioBrowserStreams(station.name);
    const allStreams = [...streams, ...rbStreams];
    return {
      id: station.id,
      name: station.name,
      logo: station.logo || station.image,
      streams: allStreams,
      streamUrl: allStreams[0]?.url || null
    };
  } catch (e) {
    console.error("Get station error:", e);
    return { id, name: "Unknown", logo: "", streams: [], streamUrl: "" };
  }
}

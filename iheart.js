import fetch from "node-fetch";

const BASE = "https://us.api.iheart.com/api/v2";

export async function searchStations(query) {
  const url = `${BASE}/search/all?keywords=${encodeURIComponent(query)}&limit=50`;
  const res = await fetch(url);
  const data = await res.json();

  return (data?.stations || []).map(station => ({
    id: station.id,
    name: station.name,
    logo: station.logo,
    streamUrl: station.streams?.hls_stream || station.streams?.primary
  }));
}

export async function getTopStations() {
  const url = `${BASE}/content/liveStations?limit=50`;
  const res = await fetch(url);
  const data = await res.json();

  return (data?.hits || []).map(station => ({
    id: station.id,
    name: station.name,
    logo: station.logo,
    streamUrl: station.streams?.hls_stream || station.streams?.primary
  }));
}

export async function getStation(id) {
  const url = `${BASE}/content/liveStations/${id}`;
  const res = await fetch(url);
  const station = await res.json();

  return {
    id: station.id,
    name: station.name,
    logo: station.logo,
    streamUrl: station.streams?.hls_stream || station.streams?.primary
  };
}

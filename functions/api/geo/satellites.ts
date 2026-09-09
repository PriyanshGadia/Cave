export const onRequestGet: PagesFunction = async () => {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
      headers: { 'User-Agent': 'Cave-Vault-Intel/1.0' }
    });
    if (!res.ok) throw new Error(`ISS upstream error ${res.status}`);
    const data = await res.json() as any;
    return new Response(JSON.stringify({
      name: 'ISS (ZARYA)',
      id: 25544,
      lat: Number(data.latitude),
      lon: Number(data.longitude),
      altitude_km: Number(data.altitude),
      velocity_kmh: Number(data.velocity),
      visibility: data.visibility || 'daylight',
      footprint_km: Number(data.footprint),
      timestamp: data.timestamp
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

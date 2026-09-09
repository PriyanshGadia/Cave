export const onRequestGet: PagesFunction = async () => {
  try {
    let flights: any[] = [];
    try {
      const res = await fetch('https://opensky-network.org/api/states/all', {
        headers: { 'User-Agent': 'Cave-Vault-Intel/1.0 (Research)' }
      });
      if (res.ok) {
        const data = await res.json() as any;
        const states = data.states || [];
        flights = states
          .filter((s: any) => s[5] != null && s[6] != null && s[1] && s[1].trim())
          .slice(0, 80)
          .map((s: any) => ({
            callsign: (s[1] || '').trim(),
            country: s[2] || '',
            lon: Number(s[5]),
            lat: Number(s[6]),
            alt_m: Number(s[7] || s[13] || 10000),
            velocity_kmh: Math.round(Number(s[9] || 250) * 3.6),
            heading: Number(s[10] || 0)
          }));
      }
    } catch {
      // Fallback to adsb.lol if OpenSky is rate-limited
    }

    if (flights.length === 0) {
      const adsbRes = await fetch('https://api.adsb.lol/v2/ladd', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (adsbRes.ok) {
        const adsb = await adsbRes.json() as any;
        flights = (adsb.ac || [])
          .filter((a: any) => a.lat != null && a.lon != null && (a.flight || a.r))
          .slice(0, 80)
          .map((a: any) => ({
            callsign: (a.flight || a.r || 'UNKN').trim(),
            country: 'INTL',
            lon: Number(a.lon),
            lat: Number(a.lat),
            alt_m: Math.round(Number(a.alt_baro || 30000) * 0.3048),
            velocity_kmh: Math.round(Number(a.gs || 450) * 1.852),
            heading: Number(a.track || 0)
          }));
      }
    }

    return new Response(JSON.stringify({
      count: flights.length,
      timestamp: Date.now(),
      flights
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, flights: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

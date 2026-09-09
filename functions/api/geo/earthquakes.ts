export const onRequestGet: PagesFunction = async () => {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', {
      headers: { 'User-Agent': 'Cave-Vault-Intel/1.0' }
    });
    if (!res.ok) throw new Error(`USGS upstream error ${res.status}`);
    const data = await res.json() as any;
    const quakes = (data.features || [])
      .filter((f: any) => f.properties && f.properties.mag != null && f.geometry?.coordinates?.length >= 2)
      .slice(0, 100)
      .map((f: any) => ({
        id: f.id,
        title: f.properties.title || 'Seismic Event',
        mag: Number(f.properties.mag),
        place: f.properties.place || 'Unknown',
        lon: Number(f.geometry.coordinates[0]),
        lat: Number(f.geometry.coordinates[1]),
        depth_km: Number(f.geometry.coordinates[2] || 0),
        time: f.properties.time
      }));

    return new Response(JSON.stringify({
      count: quakes.length,
      generated: data.metadata?.generated || Date.now(),
      earthquakes: quakes
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, earthquakes: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

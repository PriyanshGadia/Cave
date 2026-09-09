export const onRequestGet: PagesFunction = async (context) => {
  const cf = (context.request as any).cf || {};
  return new Response(JSON.stringify({
    lat: cf.latitude != null ? Number(cf.latitude) : null,
    lon: cf.longitude != null ? Number(cf.longitude) : null,
    city: cf.city ?? null,
    country: cf.country ?? null,
    timezone: cf.timezone ?? null,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store'
    }
  });
};

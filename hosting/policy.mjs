const crawlers = /\b(?:GPTBot|ChatGPT-User|ClaudeBot|Claude-Web|PerplexityBot|Googlebot|bingbot|LinkedInBot|Greenhouse|Lever|Workday|Ashby|Eightfold|iCIMS|DuckDuckBot|Applebot)\b/i;

export function wantsText(url, agent = '') {
 if (url.searchParams.get('format') === 'visual') return false;
 return url.searchParams.get('format') === 'text' || url.searchParams.get('ats') === '1' || crawlers.test(agent);
}

export const textPath = '/portfolio/about-text.html';
export const assetCache = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=3600';
export const pageCache = 'public, max-age=0, s-maxage=300, stale-while-revalidate=60';
export const privateCache = 'private, no-store';

export function applyHeaders(res) {
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
}

const maxBody = 4096;
async function bodyBytes(req) {
 if (req.body !== undefined) {
  const bytes=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));
  return bytes.length<=maxBody?bytes:null;
 }
 const chunks=[];
 let total=0;
 for await (const chunk of req.iterator({destroyOnReturn:false})) {
  total+=chunk.length;
  if (total>maxBody) {
   req.resume();
   return null;
  }
  chunks.push(chunk);
 }
 return Buffer.concat(chunks,total);
}

export async function calendarGateway(req,res) {
 applyHeaders(res);
 res.setHeader('Cache-Control',privateCache);
 res.setHeader('Content-Type','application/json; charset=utf-8');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 const { method }=req;
 if (method!=='GET' && method!=='POST') {
  res.setHeader('Allow','GET, POST');
  return send(405,{error:'method_not_allowed'});
 }
 if (method==='POST' && (!process.env.PUBLIC_ORIGIN || req.headers.origin!==process.env.PUBLIC_ORIGIN)) {
  return send(403,{error:'origin_denied'});
 }
 if (!process.env.CALENDAR_ENDPOINT) return send(method==='GET'?200:503,{status:'not_configured',slots:[]});
 try {
  const target=new URL(process.env.CALENDAR_ENDPOINT);
  if(target.protocol!=='https:') throw new Error('Calendar endpoint must use HTTPS');
  const query=new URL(req.url,'http://localhost').searchParams;
  for(const key of ['month','timezone']) {
   if(query.has(key)) target.searchParams.set(key,query.get(key));
  }
  const headers={Accept:'application/json'};
  let body;
  if(method==='POST') {
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')) return send(415,{error:'invalid_content_type'});
   if(Number(req.headers['content-length'])>maxBody) return send(413,{error:'invalid_request'});
   body=await bodyBytes(req);
   if(!body) return send(413,{error:'invalid_request'});
   headers['Content-Type']='application/json';
   headers['Idempotency-Key']=req.headers['idempotency-key']||'';
   headers.Origin=target.origin;
   headers.Authorization=req.headers.authorization||'';
   headers['X-Booking-Device']=req.headers['x-booking-device']||'';
  }
  const response=await fetch(target,{method,headers,body,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(response.headers.has('retry-after')) res.setHeader('Retry-After',response.headers.get('retry-after'));
  return send(response.status,await response.json());
 } catch {
  return send(502,{error:'calendar_unavailable'});
 }
}

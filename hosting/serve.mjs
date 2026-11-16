import {createServer} from 'node:http';
import {createReadStream,readFileSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {isIP} from 'node:net';
import {extname} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {applyHeaders,assetCache,calendarGateway,pageCache,privateCache,textPath,wantsText} from './policy.mjs';

const root=new URL('../runtime/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));
const staticFiles=new Set(manifest.filter(name=>!name.endsWith('.txt')||name==='portfolio/profile.txt'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.txt':'text/plain; charset=utf-8','.mp3':'audio/mpeg','.pdf':'application/pdf','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const audioFiles=new Set(manifest.filter(name=>name.endsWith('.mp3')));
const hops=Math.max(0,Math.min(8,Number(process.env.TRUSTED_PROXY_HOPS)||0));
const limits=new Map();
const windowMs=60_000;

function clientIP(req) {
 const forwarded=(req.headers['x-forwarded-for']||'').split(',').map(ip=>ip.trim());
 const candidate=hops>0?forwarded.at(-hops):null;
 return candidate&&isIP(candidate)?candidate:req.socket.remoteAddress||'unknown';
}

function consume(req,key,max,res) {
 const now=Date.now(), id=clientIP(req)+' '+key;
 let row=limits.get(id);
 if(!row||now>=row.expires) {
  if(limits.size>=10000) {
   for(const [name,entry] of limits) if(now>=entry.expires) limits.delete(name);
   if(limits.size>=10000 && !limits.has(id)) {
    res.writeHead(503,{'Cache-Control':privateCache,'Retry-After':'60'});
    res.end('Try again shortly');
    return false;
   }
  }
  row={count:0,expires:now+windowMs};
  limits.set(id,row);
 }
 if(++row.count<=max) return true;
 res.writeHead(429,{'Cache-Control':privateCache,'Retry-After':Math.ceil((row.expires-now)/1000)});
 res.end('Too many requests');
 return false;
}

const server=createServer(async (req,res)=>{
 applyHeaders(res);
 if(!req.url?.startsWith('/')||req.url.startsWith('//')) {res.writeHead(400,{'Cache-Control':privateCache});res.end();return;}
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/portfolio-calendar') {
  const write=req.method==='POST';
  if(consume(req,write?'calendar-write':'calendar-read',write?8:40,res)) await calendarGateway(req,res);
  return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD') {
  res.writeHead(405,{Allow:'GET, HEAD','Cache-Control':privateCache});res.end();return;
 }
 if(['/about/','/about-3d/','/about/text/'].includes(url.pathname)) {
  res.writeHead(308,{Location:url.pathname.slice(0,-1)+url.search});res.end();return;
 }
 const about=['/','/about','/about.html'].includes(url.pathname);
 const dossier=url.pathname==='/about/text'||url.pathname===textPath;
 if(about||dossier) {
  if(!consume(req,'page',120,res)) return;
  if(about) {
   res.setHeader('Vary','User-Agent');
   res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
   res.setHeader('Cache-Control',privateCache);
   if(wantsText(url,req.headers['user-agent'])) {
    res.writeHead(307,{Location:'/about/text'});res.end();return;
   }
  }
 }
 const name=about?'about.html':dossier?textPath.slice(1):url.pathname==='/about-3d'?'about-3d.html':url.pathname.slice(1);
 if(!staticFiles.has(name)) {res.writeHead(404,{'Cache-Control':privateCache});res.end();return;}
 const file=new URL(name,root);
 try {
  const info=await stat(file);
  const tag=`W/"${info.size}-${Math.trunc(info.mtimeMs)}"`;
  res.setHeader('Content-Type',mime[extname(name)]||'application/octet-stream');
  if(!about) res.setHeader('Cache-Control',dossier?pageCache:assetCache);
  res.setHeader('ETag',tag);
  if(req.headers['if-none-match']===tag) {res.writeHead(304);res.end();return;}
  if(audioFiles.has(name)) res.setHeader('Accept-Ranges','bytes');
  const range=audioFiles.has(name)&&/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  const start=range?Number(range[1]):0, end=range&&range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;
  if(start> end||start>=info.size) {res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
  if(range) res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
  res.writeHead(range?206:200,{'Content-Length':end-start+1});
  if(req.method==='HEAD') {res.end();return;}
  await pipeline(createReadStream(file,{start,end}),res);
 } catch {
  if(!res.headersSent) res.writeHead(404,{'Cache-Control':privateCache});
  if(!res.writableEnded) res.end();
 }
});
server.listen(Number(process.env.PORT)||8019,'0.0.0.0',()=>console.log('Portfolio listening on '+server.address().port));

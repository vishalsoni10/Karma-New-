const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }
});

const COOKIE = 'karma_admin';
const DEFAULT_PASSWORD = 'Karma@2026';
const textEncoder = new TextEncoder();

function b64url(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unb64url(str) {
  str = str.replace(/-/g,'+').replace(/_/g,'/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(value)));
}
function constantTimeEqual(a,b){
  if(a.length!==b.length)return false;
  let r=0; for(let i=0;i<a.length;i++) r |= a.charCodeAt(i)^b.charCodeAt(i); return r===0;
}
async function makeSession(secret){
  const payload = b64url(textEncoder.encode(JSON.stringify({exp: Date.now()+7*24*60*60*1000})));
  return payload + '.' + b64url(await hmac(secret,payload));
}
async function validSession(request, secret){
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)'+COOKIE+'=([^;]+)'));
  if(!m)return false;
  const parts=m[1].split('.'); if(parts.length!==2)return false;
  const sig=await hmac(secret,parts[0]);
  const expected=b64url(sig); if(!constantTimeEqual(expected,parts[1]))return false;
  try { const p=JSON.parse(new TextDecoder().decode(unb64url(parts[0]))); return p.exp>Date.now(); } catch { return false; }
}
function cookieHeader(value,maxAge=604800){
  return `${COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}
function getSecret(env){return env.SESSION_SECRET || 'karma-event-admin-session-change-this-secret';}
function getPassword(env){return env.ADMIN_PASSWORD || DEFAULT_PASSWORD;}

function parseDataUrl(dataUrl){
  const m=String(dataUrl||'').match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/s);
  if(!m) return null;
  const mime = m[1]==='png'?'image/png':m[1]==='webp'?'image/webp':'image/jpeg';
  const bin=atob(m[2]); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return {bytes,mime,ext:m[1]==='jpeg'?'jpg':m[1]};
}
function safe(s){return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);}
async function saveImage(env, dataUrl, keyBase){
  if(!dataUrl || String(dataUrl).startsWith('/images/')) return String(dataUrl||'');
  const parsed=parseDataUrl(dataUrl); if(!parsed) throw new Error('Invalid image data');
  const key=`events/${safe(keyBase)}-${crypto.randomUUID()}.${parsed.ext}`;
  await env.EVENT_IMAGES.put(key, parsed.bytes.buffer, {httpMetadata:{contentType:parsed.mime, cacheControl:'public, max-age=31536000, immutable'}});
  return '/images/'+key.slice('events/'.length);
}
async function deleteImage(env, url){
  if(!url || !String(url).startsWith('/images/'))return;
  const name=String(url).slice('/images/'.length);
  if(name) await env.EVENT_IMAGES.delete('events/'+name);
}

export async function onRequest(context) {
  const {request, env} = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const secret=getSecret(env);

  try {
    if(request.method==='GET' && action==='session') return json({ok:true,authenticated:await validSession(request,secret)});
    if(request.method==='POST' && action==='login') {
      const body=await request.json().catch(()=>({}));
      const password=String(body.password||'');
      if(!constantTimeEqual(password,getPassword(env))) return json({ok:false,error:'Incorrect password'},401);
      return json({ok:true},200,{'Set-Cookie':cookieHeader(await makeSession(secret))});
    }
    if(request.method==='POST' && action==='logout') return json({ok:true},200,{'Set-Cookie':cookieHeader('',0)});

    if(action==='events' && request.method==='GET') {
      const rows=await env.DB.prepare('SELECT id,name,date,location,category,description,cover_url AS cover,images_json,created_at,updated_at FROM events ORDER BY date DESC, created_at DESC').all();
      return json({ok:true,events:(rows.results||[]).map(r=>({...r,images:JSON.parse(r.images_json||'[]')}))});
    }

    const authed=await validSession(request,secret);
    if(!authed) return json({ok:false,error:'Unauthorized'},401);

    if(action==='event-save' && request.method==='POST') {
      const body=await request.json();
      if(!body.name || !body.date || !body.cover) return json({ok:false,error:'Event name, date and cover image are required'},400);
      const id=body.id || crypto.randomUUID();
      const existing=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(id).first();
      let cover=await saveImage(env,body.cover,`cover-${id}`);
      if(existing && String(body.cover).startsWith('/images/')) cover=existing.cover_url;
      const inputImages=Array.isArray(body.images)?body.images.slice(0,8):[];
      const images=[];
      for(let i=0;i<inputImages.length;i++) images.push(await saveImage(env,inputImages[i],`gallery-${id}-${i}`));
      if(existing){
        const oldImages=JSON.parse(existing.images_json||'[]');
        for(const old of oldImages) if(!images.includes(old)) await deleteImage(env,old);
        if(existing.cover_url && existing.cover_url!==cover) await deleteImage(env,existing.cover_url);
      }
      const now=new Date().toISOString();
      await env.DB.prepare(`INSERT INTO events (id,name,date,location,category,description,cover_url,images_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,date=excluded.date,location=excluded.location,category=excluded.category,description=excluded.description,cover_url=excluded.cover_url,images_json=excluded.images_json,updated_at=excluded.updated_at`)
        .bind(id,String(body.name).trim(),String(body.date),String(body.location||'').trim(),String(body.category||'').trim(),String(body.description||'').trim(),cover,JSON.stringify(images),existing?.created_at||now,now).run();
      return json({ok:true,event:{id,name:String(body.name).trim(),date:String(body.date),location:String(body.location||'').trim(),category:String(body.category||'').trim(),description:String(body.description||'').trim(),cover,images,created_at:existing?.created_at||now,updated_at:now}});
    }
    if(action==='event-delete' && request.method==='POST') {
      const body=await request.json(); const id=String(body.id||''); if(!id)return json({ok:false,error:'Missing event id'},400);
      const existing=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(id).first(); if(!existing)return json({ok:true});
      await deleteImage(env,existing.cover_url); for(const img of JSON.parse(existing.images_json||'[]')) await deleteImage(env,img);
      await env.DB.prepare('DELETE FROM events WHERE id=?').bind(id).run(); return json({ok:true});
    }

    return json({ok:false,error:'Unknown action'},404);
  } catch (err) {
    console.error(err);
    return json({ok:false,error:err instanceof Error?err.message:'Server error'},500);
  }
}

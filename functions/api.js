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
  const m=String(dataUrl||'').match(/^data:image\/(jpeg|jpg|webp|png);base64,(.+)$/s);
  if(!m) return null;
  const mime = m[1]==='png'?'image/png':m[1]==='webp'?'image/webp':'image/jpeg';
  const bin=atob(m[2]); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return {bytes,mime};
}
function imageUrl(id){ return `/api?action=image&id=${encodeURIComponent(id)}`; }
function asPublicImage(id){ return id ? imageUrl(id) : ''; }
const MAX_IMAGE_BYTES = 650000;

async function storeImage(env, dataUrl){
  if(!dataUrl) return null;
  const m=String(dataUrl).match(/\/image\/|data:image\//) ? String(dataUrl) : '';
  if(m.startsWith('/api?action=image&id=')) return {id:new URL('https://x'+m).searchParams.get('id')};
  const parsed=parseDataUrl(dataUrl);
  if(!parsed) throw new Error('Invalid image data');
  if(parsed.bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Image is too large after compression. Please use a smaller image.');
  const id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO event_images (id,mime_type,data,created_at) VALUES (?,?,?,?)')
    .bind(id,parsed.mime,parsed.bytes,new Date().toISOString()).run();
  return {id};
}
async function deleteImageById(env,id){ if(id) await env.DB.prepare('DELETE FROM event_images WHERE id=?').bind(id).run(); }
function parseImageId(url){
  try { return new URL(String(url), 'https://karma.local').searchParams.get('id'); } catch { return null; }
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

    if(action==='image' && request.method==='GET') {
      const id=String(url.searchParams.get('id')||'');
      if(!id) return new Response('Missing image id',{status:400});
      const row=await env.DB.prepare('SELECT mime_type,data FROM event_images WHERE id=?').bind(id).first();
      if(!row) return new Response('Not found',{status:404});
      // D1 returns BLOB columns as JavaScript arrays. Convert them to a byte buffer
      // before passing them to the Fetch Response body.
      let body = row.data;
      if (Array.isArray(body)) body = new Uint8Array(body);
      else if (ArrayBuffer.isView(body)) body = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      else if (body instanceof ArrayBuffer) body = new Uint8Array(body);
      return new Response(body,{status:200,headers:{'Content-Type':row.mime_type,'Cache-Control':'public, max-age=31536000, immutable'}});
    }

    if(action==='events' && request.method==='GET') {
      const rows=await env.DB.prepare(`SELECT e.id,e.name,e.date,e.location,e.category,e.description,e.cover_image_id,e.created_at,e.updated_at,
        (SELECT GROUP_CONCAT(id, ',') FROM event_images WHERE event_id=e.id ORDER BY sort_order ASC) AS image_ids
        FROM events e ORDER BY e.date DESC, e.created_at DESC`).all();
      const events=(rows.results||[]).map(r=>({
        id:r.id,name:r.name,date:r.date,location:r.location,category:r.category,description:r.description,
        cover:asPublicImage(r.cover_image_id),
        images:String(r.image_ids||'').split(',').filter(Boolean).map(asPublicImage),
        created_at:r.created_at,updated_at:r.updated_at
      }));
      return json({ok:true,events});
    }

    const authed=await validSession(request,secret);
    if(!authed) return json({ok:false,error:'Unauthorized'},401);

    if(action==='event-save' && request.method==='POST') {
      const body=await request.json();
      if(!body.name || !body.date || !body.cover) return json({ok:false,error:'Event name, date and cover image are required'},400);
      const id=body.id || crypto.randomUUID();
      const existing=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(id).first();
      const oldRows=existing ? await env.DB.prepare('SELECT id FROM event_images WHERE event_id=?').bind(id).all() : {results:[]};
      const oldIds=new Set((oldRows.results||[]).map(r=>r.id));

      const coverObj=String(body.cover).startsWith('/api?action=image&id=') ? {id:parseImageId(body.cover)} : await storeImage(env,body.cover);
      if(!coverObj?.id) throw new Error('Cover image could not be saved');
      const imageInputs=Array.isArray(body.images)?body.images.slice(0,8):[];
      const imageObjs=[];
      for(const item of imageInputs){ const obj=String(item).startsWith('/api?action=image&id=') ? {id:parseImageId(item)} : await storeImage(env,item); if(obj?.id) imageObjs.push(obj); }

      const keepIds=new Set([coverObj.id,...imageObjs.map(x=>x.id)]);
      for(const oldId of oldIds){ if(!keepIds.has(oldId)) await deleteImageById(env,oldId); }
      await env.DB.prepare('DELETE FROM event_images WHERE event_id=?').bind(id).run();
      await env.DB.prepare('INSERT INTO event_images (id,event_id,mime_type,data,sort_order,created_at) SELECT id,?,mime_type,data,CASE WHEN id=? THEN -1 ELSE ? END,created_at FROM event_images WHERE 1=0').bind(id,coverObj.id,0).run().catch(()=>{});
      // Re-link existing/new image records without duplicating their data.
      // Existing records are temporarily event-less until this point; use direct updates/inserts below.
      const allIds=[coverObj.id,...imageObjs.map(x=>x.id)];
      for(let i=0;i<allIds.length;i++){
        const imgId=allIds[i];
        await env.DB.prepare('UPDATE event_images SET event_id=?, sort_order=? WHERE id=?').bind(id,i-1,imgId).run();
      }
      const now=new Date().toISOString();
      await env.DB.prepare(`INSERT INTO events (id,name,date,location,category,description,cover_image_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,date=excluded.date,location=excluded.location,category=excluded.category,description=excluded.description,cover_image_id=excluded.cover_image_id,updated_at=excluded.updated_at`)
        .bind(id,String(body.name).trim(),String(body.date),String(body.location||'').trim(),String(body.category||'').trim(),String(body.description||'').trim(),coverObj.id,existing?.created_at||now,now).run();
      return json({ok:true,event:{id,name:String(body.name).trim(),date:String(body.date),location:String(body.location||'').trim(),category:String(body.category||'').trim(),description:String(body.description||'').trim(),cover:asPublicImage(coverObj.id),images:imageObjs.map(x=>asPublicImage(x.id)),created_at:existing?.created_at||now,updated_at:now}});
    }

    if(action==='event-delete' && request.method==='POST') {
      const body=await request.json(); const id=String(body.id||''); if(!id)return json({ok:false,error:'Missing event id'},400);
      const rows=await env.DB.prepare('SELECT id FROM event_images WHERE event_id=?').bind(id).all();
      for(const r of (rows.results||[])) await deleteImageById(env,r.id);
      await env.DB.prepare('DELETE FROM event_images WHERE event_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM events WHERE id=?').bind(id).run();
      return json({ok:true});
    }

    return json({ok:false,error:'Unknown action'},404);
  } catch (err) {
    console.error(err);
    return json({ok:false,error:err instanceof Error?err.message:'Server error'},500);
  }
}

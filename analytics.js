/* Karma Event live gallery + UI compatibility layer. */
(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const style = document.createElement('style');
  style.textContent = `
    .gallery-img{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;position:relative;overflow:hidden;}
    .gallery-img.has-real-image .gallery-visual{display:none!important;}
    .gallery-img.has-real-image{height:260px!important;}
    .gallery-item.gallery-hidden{display:none!important;}
    .gallery-item .gallery-overlay{z-index:3;}
    .gallery-item .gallery-overlay span{position:relative;z-index:4;}
    #gallery .gallery-empty-live{column-span:all;text-align:center;padding:50px 20px;color:rgba(248,245,238,.55);font-size:.75rem;border:1px dashed rgba(212,175,55,.18);border-radius:6px;}
    #gallery .gallery-grid.live-gallery-grid{display:block;columns:initial;}
    #gallery .live-gallery-photo{break-inside:avoid;margin-bottom:16px;position:relative;overflow:hidden;border-radius:4px;border:1px solid transparent;transition:border-color .4s;}
    #gallery .live-gallery-photo:hover{border-color:rgba(212,175,55,.5);}
    #gallery .live-gallery-photo img{width:100%;display:block;max-height:760px;object-fit:cover;border-radius:4px;transition:transform .6s ease;}
    #gallery .live-gallery-photo:hover img{transform:scale(1.025);}
    #gallery .live-gallery-photo .live-photo-shine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top,rgba(10,10,10,.16),transparent 35%);}
    @media(min-width:700px){#gallery .live-gallery-grid{columns:3;column-gap:16px;}#gallery .live-gallery-photo{display:inline-block;width:100%;}}
    @media(max-width:768px){.gallery-img.has-real-image{height:230px!important;}}
    @media(max-width:480px){.gallery-img.has-real-image{height:auto!important;aspect-ratio:4/3;}}
    #adminApp .luxury-admin-note{font-size:.68rem;color:rgba(248,245,238,.55);margin-top:6px;line-height:1.6;}
    #adminApp .luxury-server-badge{display:inline-block;margin-left:8px;padding:3px 8px;border-radius:12px;font-size:.5rem;letter-spacing:.1em;text-transform:uppercase;color:#4caf7d;background:rgba(76,175,125,.12);border:1px solid rgba(76,175,125,.25);}
    #adminApp .luxury-admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;}
    #adminApp .luxury-admin-card{position:relative;aspect-ratio:4/3;border-radius:6px;overflow:hidden;background:#1a1a1a;border:1px solid rgba(212,175,55,.18);}
    #adminApp .luxury-admin-card img{width:100%;height:100%;object-fit:cover;display:block;}
    #adminApp .luxury-admin-card .luxury-admin-overlay{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:flex-end;padding:12px;background:linear-gradient(to top,rgba(10,10,10,.72),transparent 55%);opacity:0;transition:opacity .2s;}
    #adminApp .luxury-admin-card:hover .luxury-admin-overlay{opacity:1;}
    #adminApp .luxury-admin-delete{padding:7px 12px;border-radius:3px;font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;background:rgba(224,85,85,.18);color:#e05555;border:1px solid rgba(224,85,85,.45);}
    #adminApp .luxury-admin-delete:hover{background:rgba(224,85,85,.32);}
    @media(max-width:600px){#adminApp .luxury-admin-grid{grid-template-columns:repeat(2,1fr);}}
  `;
  document.head.appendChild(style);

  // ================================================================
  // PUBLIC LUXURY GALLERY — ONLY the separate luxury_gallery_images data
  // ================================================================
  async function loadLuxuryGalleryLive() {
    const grid = document.querySelector('#gallery .gallery-grid');
    if (!grid) return;
    try {
      const response = await fetch('/api?action=luxury-gallery', { cache: 'no-store' });
      const data = await response.json();
      const images = Array.isArray(data.images) ? data.images : [];
      grid.classList.add('live-gallery-grid');
      grid.innerHTML = '';
      if (!images.length) {
        grid.innerHTML = '<div class="gallery-empty-live">Luxury Gallery photos will appear here soon.</div>';
        return;
      }
      images.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'live-gallery-photo';
        card.innerHTML = `<img src="${esc(item.src)}" alt="Karma Event Luxury Gallery" loading="lazy"><div class="live-photo-shine"></div>`;
        grid.appendChild(card);
      });
    } catch (error) {
      // Do not replace the page with fake images if the live gallery is unavailable.
      grid.innerHTML = '<div class="gallery-empty-live">Luxury Gallery is temporarily unavailable.</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLuxuryGalleryLive);
  else loadLuxuryGalleryLive();
  window.addEventListener('load', loadLuxuryGalleryLive);

  // ================================================================
  // COMPLETED EVENTS — remain completely separate from Luxury Gallery
  // ================================================================
  function formatLiveDate(value){
    return value ? new Date(value+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';
  }
  async function loadCompletedEventsLive(){
    const grid=document.getElementById('completedEventsGrid');
    if(!grid)return;
    let events=[];
    try{
      const r=await fetch('/api?action=events',{cache:'no-store'});
      const d=await r.json();
      events=Array.isArray(d.events)?d.events:[];
    }catch(e){}
    if(!events.length){
      grid.innerHTML='<div class="completed-empty">Our completed event portfolio will appear here soon.</div>';
      return;
    }
    grid.innerHTML=events.map(item=>`<article class="completed-event-card reveal"><div class="completed-event-cover"><img src="${esc(item.cover)}" alt="${esc(item.name)}" loading="lazy"></div><div class="completed-event-body"><div class="completed-event-meta">${esc(item.category||'Completed Event')} · ${formatLiveDate(item.date)}</div><h3>${esc(item.name)}</h3><p>${esc(item.location||'')}${item.location&&item.description?' · ':''}${esc(item.description||'')}</p><button class="completed-event-btn" onclick="openCompletedEvent('${esc(item.id)}')">View Event ✦</button></div></article>`).join('');
    window.karmaCompletedEvents=events;
    document.querySelectorAll('#completedEventsGrid .reveal').forEach(el=>{if(typeof revealObserver!=='undefined')revealObserver.observe(el);});
  }
  window.loadCompletedEventsLive = loadCompletedEventsLive;
  function openCompletedEvent(id){
    const events=Array.isArray(window.karmaCompletedEvents)?window.karmaCompletedEvents:[];
    const item=events.find(x=>x.id===id);if(!item)return;
    document.getElementById('completedModalMeta').textContent=`${item.category||'Completed Event'} · ${formatLiveDate(item.date)}${item.location?' · '+item.location:''}`;
    document.getElementById('completedModalTitle').textContent=item.name||'Completed Event';
    document.getElementById('completedModalDesc').textContent=item.description||'Premium event management by Karma.';
    const images=[item.cover,...(Array.isArray(item.images)?item.images:[])].filter(Boolean);
    document.getElementById('completedModalGallery').innerHTML=images.map((src,i)=>`<img src="${esc(src)}" alt="${esc(item.name)} image ${i+1}" loading="lazy">`).join('');
    document.getElementById('completedEventModal').classList.add('open');
    document.body.style.overflow='hidden';
    syncModalCursor();
  }
  window.openCompletedEvent = openCompletedEvent;
  function closeCompletedEvent(){
    document.getElementById('completedEventModal').classList.remove('open');
    document.body.style.overflow='';
    syncModalCursor();
  }
  window.closeCompletedEvent = closeCompletedEvent;

  // ================================================================
  // CURSOR FIX — never let the custom cursor fight the event lightbox
  // ================================================================
  function cursorHover(active) {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    dot.style.width = active ? '16px' : '8px';
    dot.style.height = active ? '16px' : '8px';
    ring.style.width = active ? '56px' : '36px';
    ring.style.height = active ? '56px' : '36px';
    ring.style.borderColor = active ? 'rgba(212,175,55,.8)' : 'rgba(212,175,55,.5)';
  }
  document.addEventListener('mouseover', (event) => {
    if (event.target && event.target.closest && event.target.closest('a,button,.service-card,.hosp-card,.gallery-item,.completed-event-card')) cursorHover(true);
  });
  document.addEventListener('mouseout', (event) => {
    const r = event.relatedTarget;
    if (!r || !r.closest || !r.closest('a,button,.service-card,.hosp-card,.gallery-item,.completed-event-card')) cursorHover(false);
  });
  window.addEventListener('blur', () => cursorHover(false));

  function syncModalCursor() {
    const cursor = document.getElementById('cursor');
    const modal = document.getElementById('completedEventModal');
    if (!cursor || !modal) return;
    const open = modal.classList.contains('open');
    cursor.style.display = open ? 'none' : '';
    document.body.style.cursor = open ? 'auto' : '';
    cursorHover(false);
  }
  const modalObserver = new MutationObserver(syncModalCursor);
  function initUiFixes() {
    const modal = document.getElementById('completedEventModal');
    if (modal) modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    syncModalCursor();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUiFixes); else initUiFixes();

  // ================================================================
  // ADMIN — separate persistent Luxury Gallery manager
  // This layer intentionally overrides the old localStorage gallery code.
  // ================================================================
  let luxuryAdminItems = [];
  let luxuryDeletingId = null;
  let adminLuxuryInstalled = false;

  async function luxuryApi(action, options={}) {
    const base={headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin'};
    const res=await fetch('/api?action='+encodeURIComponent(action),Object.assign(base,options));
    let data=null;try{data=await res.json();}catch(e){data={ok:false,error:'Server did not return JSON.'};}
    if(res.status===401)throw Object.assign(new Error(data.error||'Unauthorized'),{code:401});
    if(!res.ok||data.ok===false)throw new Error(data.error||'Request failed');
    return data;
  }

  function adminToast(msg,type='success'){
    if(typeof window.toast==='function')return window.toast(msg,type);
    const wrap=document.getElementById('toastWrap');if(!wrap)return;
    const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;wrap.appendChild(el);setTimeout(()=>el.remove(),3000);
  }

  function updateLuxuryAdminStats(){
    const total=luxuryAdminItems.length;
    const totalEl=document.getElementById('statTotal');if(totalEl)totalEl.textContent=total;
    const slotsEl=document.getElementById('statSlots');if(slotsEl)slotsEl.textContent='∞';
    const filledEl=document.getElementById('statFilled');if(filledEl)filledEl.textContent=total;
    const emptyEl=document.getElementById('statEmpty');if(emptyEl)emptyEl.textContent='—';
    const count=document.getElementById('gridCount');if(count)count.textContent=`${total} photo${total===1?'':'s'}`;
    const title=document.querySelector('#galleryGrid')?.closest('.section-card')?.querySelector('.section-card-header h2');
    if(title && !title.querySelector('.luxury-server-badge')) title.insertAdjacentHTML('beforeend','<span class="luxury-server-badge">Server Saved</span>');
  }

  function renderLuxuryAdminGrid(){
    const grid=document.getElementById('galleryGrid');if(!grid)return;
    grid.className='luxury-admin-grid';
    grid.innerHTML='';
    if(!luxuryAdminItems.length){
      grid.innerHTML='<div class="event-empty" style="grid-column:1/-1;">No Luxury Gallery photos yet. Upload photos above.</div>';
      updateLuxuryAdminStats();return;
    }
    luxuryAdminItems.forEach((item,index)=>{
      const card=document.createElement('div');card.className='luxury-admin-card';
      card.innerHTML=`<img src="${esc(item.src)}" alt="Luxury Gallery photo ${index+1}" loading="lazy"><div class="luxury-admin-overlay"><button class="luxury-admin-delete" type="button">🗑 Delete</button></div>`;
      card.querySelector('button').addEventListener('click',()=>openLuxuryDelete(item));
      grid.appendChild(card);
    });
    updateLuxuryAdminStats();
  }

  async function loadLuxuryAdminGallery(){
    try{
      const d=await luxuryApi('luxury-gallery');
      luxuryAdminItems=Array.isArray(d.images)?d.images:[];
      renderLuxuryAdminGrid();
    }catch(e){
      if(e.code!==401)adminToast(e.message||'Could not load Luxury Gallery','error');
    }
  }

  function readLuxuryImage(file){
    return new Promise((resolve,reject)=>{
      if(!file.type.startsWith('image/'))return reject(new Error(`${file.name} is not an image`));
      if(file.size>15*1024*1024)return reject(new Error(`${file.name} exceeds 15MB`));
      const reader=new FileReader();
      reader.onload=e=>{
        const img=new Image();
        img.onload=()=>{
          let max=1800,quality=.78;
          const canvas=document.createElement('canvas');
          const render=()=>{
            const scale=Math.min(1,max/img.width,max/img.height);
            canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
            const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
            const out=canvas.toDataURL('image/jpeg',quality);
            if(out.length>850000&&quality>.5){quality-=.06;return render();}
            if(out.length>850000&&max>900){max=Math.max(900,Math.round(max*.82));quality=.68;return render();}
            resolve(out);
          };render();
        };img.onerror=()=>reject(new Error(`Could not read ${file.name}`));img.src=e.target.result;
      };
      reader.onerror=()=>reject(new Error(`Could not read ${file.name}`));reader.readAsDataURL(file);
    });
  }

  async function uploadLuxuryFiles(files){
    const list=Array.from(files||[]).filter(Boolean);if(!list.length)return;
    const maxBatch=20;const selected=list.slice(0,maxBatch);
    const progressWrap=document.getElementById('uploadProgress'),fill=document.getElementById('uploadFill'),label=document.getElementById('uploadLabel');
    if(progressWrap)progressWrap.style.display='block';if(label)label.style.display='block';
    try{
      const encoded=[];
      for(let i=0;i<selected.length;i++){
        if(label)label.textContent=`Preparing ${i+1} of ${selected.length}...`;
        encoded.push(await readLuxuryImage(selected[i]));
        if(fill)fill.style.width=Math.round(((i+1)/selected.length)*50)+'%';
      }
      if(label)label.textContent='Saving to server...';
      const d=await luxuryApi('luxury-save',{method:'POST',body:JSON.stringify({images:encoded})});
      if(fill)fill.style.width='100%';
      const added=Array.isArray(d.images)?d.images:[];
      luxuryAdminItems=[...luxuryAdminItems,...added];
      renderLuxuryAdminGrid();
      adminToast(`${added.length} photo${added.length===1?'':'s'} added to Luxury Gallery ✓`,'success');
    }catch(e){adminToast(e.message||'Could not upload Luxury Gallery photos','error');}
    finally{
      if(progressWrap)progressWrap.style.display='none';if(label)label.style.display='none';if(fill)fill.style.width='0%';
    }
  }

  window.processFiles=function(files){uploadLuxuryFiles(files);};
  window.handleBulkUpload=function(input){uploadLuxuryFiles(input?.files||[]);if(input)input.value='';};
  window.handleSlotUpload=function(input){uploadLuxuryFiles(input?.files||[]);if(input)input.value='';};
  window.renderGrid=function(){renderLuxuryAdminGrid();};
  window.updateStats=function(){updateLuxuryAdminStats();};
  window.save=function(){};
  window.sortByName=function(){adminToast('Luxury Gallery uses upload order.','success');};
  window.sortByDate=function(){adminToast('Luxury Gallery uses upload order.','success');};
  window.applyToWebsite=function(){loadLuxuryGalleryLive();adminToast('Luxury Gallery is already live from the server ✓','success');};
  window.previewGallery=function(){
    const grid=document.getElementById('previewGrid');if(!grid)return;
    grid.innerHTML=luxuryAdminItems.length?luxuryAdminItems.map(item=>`<img src="${esc(item.src)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:3px;">`).join(''):'<div style="padding:40px;text-align:center;color:var(--muted);grid-column:1/-1;">No Luxury Gallery photos uploaded.</div>';
    document.getElementById('previewModal')?.classList.add('open');
  };
  window.openEdit=function(){adminToast('Luxury Gallery is photo-only. Use Delete and Add Images to manage photos.','success');};
  window.saveEdit=function(){};

  function openLuxuryDelete(item){
    luxuryDeletingId=item?.id||null;if(!luxuryDeletingId)return;
    const preview=document.getElementById('deletePreview');if(preview)preview.innerHTML=`<img src="${esc(item.src)}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
    document.getElementById('deleteModal')?.classList.add('open');
  }
  window.openDelete=openLuxuryDelete;
  window.confirmDelete=async function(){
    if(!luxuryDeletingId)return;
    const id=luxuryDeletingId;
    try{
      await luxuryApi('luxury-delete',{method:'POST',body:JSON.stringify({id})});
      luxuryAdminItems=luxuryAdminItems.filter(x=>x.id!==id);
      document.getElementById('deleteModal')?.classList.remove('open');
      luxuryDeletingId=null;renderLuxuryAdminGrid();adminToast('Luxury Gallery photo deleted ✓','success');
    }catch(e){adminToast(e.message||'Could not delete photo','error');}
  };
  window.clearAll=async function(){
    if(!luxuryAdminItems.length){adminToast('Luxury Gallery is already empty','error');return;}
    if(!confirm(`Remove all ${luxuryAdminItems.length} Luxury Gallery photos?`))return;
    try{await luxuryApi('luxury-delete-all',{method:'POST'});luxuryAdminItems=[];renderLuxuryAdminGrid();adminToast('Luxury Gallery cleared ✓','success');}
    catch(e){adminToast(e.message||'Could not clear gallery','error');}
  };
  window.exportData=async function(){
    try{const d=await luxuryApi('luxury-gallery');const blob=new Blob([JSON.stringify({luxuryGallery:d.images||[]},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='karma-luxury-gallery-config.json';a.click();URL.revokeObjectURL(url);adminToast('Luxury Gallery list exported ✓','success');}catch(e){adminToast(e.message||'Export failed','error');}
  };

  function installAdminLuxuryLayer(){
    if(adminLuxuryInstalled||!document.getElementById('adminApp'))return;
    adminLuxuryInstalled=true;
    const header=document.querySelector('#adminApp .page-header p');
    if(header)header.innerHTML='Manage the live Luxury Gallery independently from Completed Events.<br><span class="luxury-admin-note">Photos are stored on the Cloudflare server and remain available after refresh or login. Delete any photo whenever you want.</span>';
    const section=document.getElementById('eventsSection');if(section)section.querySelector('.section-card-header h2')?.insertAdjacentHTML('afterbegin','');
    loadLuxuryAdminGallery();
    const zone=document.getElementById('dropZone');
    if(zone&&!zone.dataset.luxuryBound){
      zone.dataset.luxuryBound='1';
      zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
      zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
      zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');uploadLuxuryFiles(e.dataTransfer.files);});
    }
  }

  function watchAdmin(){
    const app=document.getElementById('adminApp');
    if(!app)return;
    const observer=new MutationObserver(()=>{if(getComputedStyle(app).display!=='none')installAdminLuxuryLayer();});
    observer.observe(app,{attributes:true,attributeFilter:['style']});
    if(getComputedStyle(app).display!=='none')installAdminLuxuryLayer();
    setTimeout(()=>{if(getComputedStyle(app).display!=='none')installAdminLuxuryLayer();},100);
    setTimeout(()=>{if(getComputedStyle(app).display!=='none')installAdminLuxuryLayer();},800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchAdmin);else watchAdmin();

  window.addEventListener('load',()=>{
    try{loadCompletedEventsLive();}catch(e){}
    try{loadLuxuryGalleryLive();}catch(e){}
  });
})();

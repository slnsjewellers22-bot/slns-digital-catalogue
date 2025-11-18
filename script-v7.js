/* SLNS V7 — Main script (Phase 1)
   Features implemented:
   - modern UI + tabs
   - lazy loading with blur -> remove on load
   - order cart (localStorage)
   - PWA registration (service worker)
   - dark mode toggle
   - weight parsing from filenames + weights.json fallback
   - admin sync hook (manual)
   - multi-language skeleton
*/

/* -------- CONFIG -------- */
const metals = ["gold"];
const types = ["all","bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
const maxImages = 500; // safe upper bound
const imagesPath = "images";
const weightsFile = "weights.json";
const itemsPerPage = 12;
const waNumber = "917780220369";

/* -------- DOM -------- */
const gallery = document.getElementById("gallery");
const searchBox = document.getElementById("searchBox");
const menuToggle = document.getElementById("menuToggle");
const filterPanel = document.getElementById("filterPanel");
const categoryTabs = document.getElementById("categoryTabs");
const weightFrom = document.getElementById("weightFrom");
const weightTo = document.getElementById("weightTo");
const rangeMin = document.getElementById("rangeMin");
const rangeMax = document.getElementById("rangeMax");
const applyFilters = document.getElementById("applyFilters");
const clearFilters = document.getElementById("clearFilters");
const syncBtn = document.getElementById("syncBtn");
const noImages = document.getElementById("noImages");
const pagination = document.getElementById("pagination");
const cartToggle = document.getElementById("cartToggle");
const cartDrawer = document.getElementById("cartDrawer");
const cartCount = document.getElementById("cartCount");
const cartItemsEl = document.getElementById("cartItems");
const sendOrderBtn = document.getElementById("sendOrder");
const homeBtn = document.getElementById("homeBtn");
const adminBtn = document.getElementById("adminBtn");
const darkToggle = document.getElementById("darkToggle");

/* Modal elements */
const modal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const modalClose = document.getElementById("modalClose");
const orderBtn = document.getElementById("orderBtn");

/* -------- State -------- */
let allItems = [];       // master list
let displayed = [];      // filtered list
let validList = [];      // images that actually exist
let weights = {};        // loaded from weights.json or filename
let currentTab = "all";
let currentPage = 1;
let cart = JSON.parse(localStorage.getItem("slns_cart")||"[]");
let currentModalIndex = -1;

/* -------- Helpers -------- */
function capitalize(s){ return s[0].toUpperCase()+s.slice(1); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function round3(v){ return Math.round(v*1000)/1000; }

/* -------- Build master list (ids and default src). We will probe actual files later -------- */
(function build(){
  for(const m of metals){
    for(const t of types){
      if(t==="all") continue;
      for(let i=1;i<=maxImages;i++){
        const id = `${m}_${t}${i}`;
        allItems.push({
          id,
          src:`${imagesPath}/${id}.jpg`,
          name:`${capitalize(m)} ${capitalize(t)} ${i}`,
          metal:m,
          type:t,
        });
      }
    }
  }
})();

/* -------- Weight parsing util (filename like gold_ring1_15.750.jpg) -------- */
function parseWeightFromFilename(src){
  // get last segment
  const name = src.split('/').pop();
  // try match _15.750 before extension
  const m = name.match(/_(\d+(?:\.\d+))(?=\.[a-zA-Z]{2,4}$)/);
  if(m) return parseFloat(m[1]);
  return undefined;
}

/* -------- Load weights.json fallback -------- */
fetch(weightsFile).then(r=>{
  if(!r.ok) throw null;
  return r.json();
}).then(j=>{
  Object.keys(j).forEach(k=> weights[k.toLowerCase()] = j[k]);
}).catch(()=>{/* no weights.json or error, continue */})
.finally(()=> {
  // parse weights from filenames into weights map (if not present)
  allItems.forEach(it=>{
    const parsed = parseWeightFromFilename(it.src);
    if(parsed!==undefined) weights[it.id.toLowerCase()] = parsed;
  });

  initUI();
  applyFiltersAndRender();
});

/* -------- UI init: tabs, handlers, cart -------- */
function initUI(){
  // tabs
  categoryTabs.innerHTML = "";
  types.forEach(t=>{
    const b = document.createElement("button");
    b.className = "tab"+(t===currentTab?" active":"");
    b.textContent = t.toUpperCase();
    b.dataset.type = t;
    b.onclick = ()=>{ currentTab = t; document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); b.classList.add("active"); currentPage=1; applyFiltersAndRender(); };
    categoryTabs.appendChild(b);
  });

  // filter panel toggle
  menuToggle.onclick = ()=> filterPanel.classList.toggle("show");
  document.addEventListener("click", e=>{ if(!filterPanel.contains(e.target) && e.target!==menuToggle) filterPanel.classList.remove("show"); });

  // weight sliders sync
  rangeMin.oninput = ()=>{ if(+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value; weightFrom.value = round3(rangeMin.value); };
  rangeMax.oninput = ()=>{ if(+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value; weightTo.value = round3(rangeMax.value); };
  weightFrom.oninput = ()=> rangeMin.value = clamp(+weightFrom.value||0,0,250);
  weightTo.oninput = ()=> rangeMax.value = clamp(+weightTo.value||0,0,250);

  // control buttons
  applyFilters.onclick = ()=>{ currentPage=1; applyFiltersAndRender(); filterPanel.classList.remove("show"); };
  clearFilters.onclick = ()=>{ searchBox.value=''; weightFrom.value=''; weightTo.value=''; rangeMin.value=0; rangeMax.value=250; currentPage=1; applyFiltersAndRender(); };
  syncBtn.onclick = ()=> manualSync();

  // cart
  updateCartUI();
  cartToggle.onclick = ()=> cartDrawer.classList.toggle("show");
  sendOrderBtn.onclick = ()=> sendCartOrder();

  // modal
  modalClose.onclick = ()=> modal.hidden = true;
  modalPrev.onclick = ()=> showModal(-1);
  modalNext.onclick = ()=> showModal(1);
  modal.addEventListener("click", e=>{ if(e.target===modal) modal.hidden=true; });

  // keyboard
  document.addEventListener("keydown", e=>{
    if(!modal.hidden){
      if(e.key==='Escape') modal.hidden=true;
      if(e.key==='ArrowLeft') showModal(-1);
      if(e.key==='ArrowRight') showModal(1);
    }
  });

  // admin, home, dark
  adminBtn && (adminBtn.onclick = ()=> location.href = "/dashboard/index.html");
  homeBtn && (homeBtn.onclick = ()=> { searchBox.value=''; weightFrom.value=''; weightTo.value=''; rangeMin.value=0; rangeMax.value=250; currentTab='all'; document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); document.querySelector('.tab[data-type=\"all\"]').classList.add('active'); applyFiltersAndRender(); });
  darkToggle && (darkToggle.onclick = ()=> { document.documentElement.classList.toggle('dark'); localStorage.setItem('slns_dark', document.documentElement.classList.contains('dark') ? '1':'0'); });

  // restore dark
  if(localStorage.getItem('slns_dark')==='1') document.documentElement.classList.add('dark');

  // search debounce
  searchBox.oninput = debounce(()=> { currentPage=1; applyFiltersAndRender(); }, 180);
}

/* -------- Apply filters -> probe images -> render gallery -------- */
function applyFiltersAndRender(){
  const q = (searchBox.value||'').trim().toLowerCase();
  const minW = parseFloat(weightFrom.value);
  const maxW = parseFloat(weightTo.value);
  const weightActive = (weightFrom.value || weightTo.value);

  displayed = allItems.filter(it=>{
    if(currentTab!=='all' && it.type!==currentTab) return false;
    if(q && !(it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) return false;
    const w = weights[it.id.toLowerCase()];
    if(weightActive){
      if(w===undefined) return false;
      if(!(w >= (isNaN(minW)?-Infinity:minW) && w <= (isNaN(maxW)?Infinity:maxW))) return false;
    }
    return true;
  });

  // probe images to ensure they exist (prevents broken cards)
  validList = []; let pending = displayed.length;
  if(pending===0){ renderGallery(); return; }
  displayed.forEach(it=>{
    const img = new Image();
    img.src = it.src;
    img.onload = ()=>{ validList.push(it); if(--pending===0) renderGallery(); };
    img.onerror = ()=>{ if(--pending===0) renderGallery(); };
  });
}

/* -------- renderGallery (with pagination) -------- */
function renderGallery(){
  gallery.innerHTML = '';
  if(validList.length===0){ noImages.hidden = false; pagination.innerHTML=''; return; }
  noImages.hidden = true;

  const total = validList.length;
  const totalPages = Math.max(1, Math.ceil(total/itemsPerPage));
  if(currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage-1)*itemsPerPage;
  const pageItems = validList.slice(start, start+itemsPerPage);

  pageItems.forEach((it, idx)=>{
    const card = document.createElement('div'); card.className='card';
    const wrap = document.createElement('div'); wrap.className='imgwrap';
    const img = document.createElement('img');
    img.dataset.src = it.src;
    img.alt = it.name;
    img.loading = 'lazy';
    // blur -> remove class on load
    img.addEventListener('load', ()=> img.classList.add('loaded'));
    img.addEventListener('error', ()=> img.classList.add('loaded'));
    wrap.appendChild(img);

    const meta = document.createElement('div'); meta.className='meta';
    const name = document.createElement('div'); name.className='name'; name.textContent = it.name;
    const w = weights[it.id.toLowerCase()];
    const weightDiv = document.createElement('div'); weightDiv.className='weight'; weightDiv.textContent = w ? `${round3(w)} g` : '';
    meta.appendChild(name); meta.appendChild(weightDiv);

    const add = document.createElement('button'); add.className='add'; add.textContent='Add';
    add.onclick = (e)=>{ e.stopPropagation(); addToCart(it); };

    card.appendChild(wrap);
    card.appendChild(meta);
    card.appendChild(add);

    // preview on click
    card.onclick = ()=> openModal(start+idx);

    gallery.appendChild(card);

    // lazy load actual image with small timeout (progressive)
    setTimeout(()=> { img.src = img.dataset.src; }, 50);
  });

  renderPagination(totalPages);
}

/* -------- pagination -------- */
function renderPagination(totalPages){
  pagination.innerHTML='';
  for(let p=1;p<=totalPages;p++){
    const b = document.createElement('button'); b.className='tab'; b.textContent=p;
    if(p===currentPage) b.classList.add('active');
    b.onclick = ()=> { currentPage=p; renderGallery(); window.scrollTo({top:0,behavior:'smooth'}); };
    pagination.appendChild(b);
  }
}

/* -------- Cart -------- */
function addToCart(item){
  const existing = cart.find(c=>c.id===item.id);
  if(existing){ existing.qty = (existing.qty||1)+1; }
  else cart.push({ id:item.id, name:item.name, src:item.src, weight:weights[item.id.toLowerCase()] || null, qty:1 });
  localStorage.setItem('slns_cart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI(){
  cartItemsEl.innerHTML = '';
  cartCount.textContent = cart.reduce((s,i)=>s+i.qty,0);
  cart.forEach(ci=>{
    const el = document.createElement('div'); el.className='cart-item';
    el.innerHTML = `<div><strong>${ci.name}</strong><div class="small">${ci.weight?round3(ci.weight)+' g':''}</div></div>
                    <div class="small">x${ci.qty}</div>`;
    cartItemsEl.appendChild(el);
  });
  document.getElementById('cartSummary').textContent = `${cart.reduce((s,i)=>s+i.qty,0)} items`;
}

/* -------- Send order via WhatsApp -------- */
function sendCartOrder(){
  if(cart.length===0) return alert('Cart empty');
  let text = `Order from SLNS Digital Catalogue:%0A`;
  cart.forEach(ci=> text += `- ${ci.name}${ci.weight?` (${round3(ci.weight)} g)`:""} x${ci.qty}%0A`);
  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
}

/* -------- Modal functions -------- */
function openModal(globalIndex){
  currentModalIndex = globalIndex;
  updateModal();
  modal.hidden = false;
}

function updateModal(){
  const item = validList[currentModalIndex];
  if(!item) return;
  modalImg.src = item.src;
  const w = weights[item.id.toLowerCase()];
  modalInfo.textContent = w ? `${item.name} — ${round3(w)} g` : item.name;
  orderBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("I want to order "+item.name+(w?` — ${round3(w)} g`:""))}`;
}

function showModal(delta){
  currentModalIndex = (currentModalIndex + delta + validList.length) % validList.length;
  updateModal();
}

/* -------- Manual admin sync hook (placeholder) -------- */
function manualSync(){
  // This function should call your admin endpoint or fetch items.json from repo
  // For now it just re-runs the local process and shows a toast
  applyFiltersAndRender();
  alert('Manual sync executed (placeholder). To auto-sync, provide admin credentials and endpoint.');
}

/* -------- Auto-register service worker for PWA -------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').then(()=>console.log('SW registered')).catch(()=>console.log('SW fail'));
}

/* -------- utility: when page loaded, initial render handled in fetch finally ---- */

/* expose debug for console */
window._SLNS_V7 = { allItems, applyFiltersAndRender, addToCart };

/* END of script */

/* script-v7.js — SLNS V7 (fixed categories, ALL shows everything)
   - Option B: fixed categories
   - ALL tab shows every image
   - Lazy load with blur-to-sharp
   - Modal preview, cart, filters, pagination
*/

/* ====== CONFIG ====== */
const metals = ["gold"];
const types = ["all","bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
const maxImages = 500;          // how many images per type to probe (increase if needed)
const imagesPath = "images";
const weightsFile = "weights.json";
const itemsPerPage = 12;
const SLIDER_MAX = 250;
const waNumber = "917780220369";

/* ====== DOM ====== */
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

/* Modal */
const modal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const modalClose = document.getElementById("modalClose");
const orderBtn = document.getElementById("orderBtn");

/* ====== STATE ====== */
let allItems = [];      // master list (id, src, name, metal, type)
let displayed = [];     // filtered list before probing
let validList = [];     // images that exist
let weights = {};       // map id -> weight
let currentTab = "all";
let currentPage = 1;
let currentModalIndex = -1;
let cart = JSON.parse(localStorage.getItem("slns_cart") || "[]");

/* ====== HELPERS ====== */
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const debounce = (fn, ms=150)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const round3 = v => Math.round(v*1000)/1000;

/* ====== Build master list (fixed categories) ====== */
(function buildMaster(){
  allItems = [];
  for(const m of metals){
    for(const t of types){
      if(t === "all") continue;
      for(let i=1;i<=maxImages;i++){
        const id = `${m}_${t}${i}`;
        allItems.push({
          id,
          src: `${imagesPath}/${id}.jpg`,
          name: `${cap(m)} ${cap(t)} ${i}`,
          metal: m,
          type: t
        });
      }
    }
  }
})();

/* ====== Parse weight from filename utility ====== */
function parseWeightFromFilename(src){
  const name = src.split('/').pop();
  const m = name.match(/_(\d+(?:\.\d+))(?=\.[a-zA-Z]{2,4}$)/);
  if(m) return parseFloat(m[1]);
  return undefined;
}

/* ====== Load weights.json and then init UI ====== */
fetch(weightsFile).then(r=>{
  if(!r.ok) throw new Error('no weights.json');
  return r.json();
}).then(j=>{
  Object.keys(j).forEach(k=> weights[k.toLowerCase()] = j[k]);
}).catch(()=>{/* ignore if missing */})
.finally(()=>{
  // enrich weights from filenames where possible (do not overwrite existing)
  allItems.forEach(it=>{
    const p = parseWeightFromFilename(it.src);
    if(p !== undefined && weights[it.id.toLowerCase()] === undefined){
      weights[it.id.toLowerCase()] = p;
    }
  });
  initUI();
  applyFiltersAndRender();
});

/* ====== UI Initialization ====== */
function initUI(){
  // build tabs (fixed list)
  categoryTabs.innerHTML = "";
  types.forEach(t=>{
    const b = document.createElement("button");
    b.className = "tab" + (t===currentTab ? " active" : "");
    b.dataset.type = t;
    b.textContent = t.toUpperCase();
    b.onclick = () => {
      currentTab = t;
      currentPage = 1;
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      applyFiltersAndRender();
      // hide panel on mobile
      filterPanel.classList.remove('show');
    };
    categoryTabs.appendChild(b);
  });

  // menu toggle
  if(menuToggle){
    menuToggle.onclick = ()=> filterPanel.classList.toggle('show');
    document.addEventListener('click', e=>{
      if(!filterPanel.contains(e.target) && e.target !== menuToggle) filterPanel.classList.remove('show');
    });
  }

  // weight slider sync
  if(rangeMin && rangeMax && weightFrom && weightTo){
    rangeMin.value = 0; rangeMax.value = SLIDER_MAX;
    rangeMin.oninput = ()=> { if(+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value; weightFrom.value = round3(rangeMin.value); };
    rangeMax.oninput = ()=> { if(+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value; weightTo.value = round3(rangeMax.value); };
    weightFrom.oninput = ()=> rangeMin.value = clamp(+weightFrom.value||0,0,SLIDER_MAX);
    weightTo.oninput = ()=> rangeMax.value = clamp(+weightTo.value||0,0,SLIDER_MAX);
  }

  // filter buttons
  if(applyFilters) applyFilters.onclick = ()=> { currentPage = 1; applyFiltersAndRender(); filterPanel.classList.remove('show'); };
  if(clearFilters) clearFilters.onclick = ()=> { searchBox.value=''; weightFrom.value=''; weightTo.value=''; rangeMin.value=0; rangeMax.value=SLIDER_MAX; currentPage=1; applyFiltersAndRender(); };

  // search debounce
  if(searchBox) searchBox.oninput = debounce(()=> { currentPage=1; applyFiltersAndRender(); }, 200);

  // sync button placeholder
  if(syncBtn) syncBtn.onclick = ()=> { alert('Manual sync placeholder — configure admin sync to auto-sync.'); };

  // pagination container already present

  // cart
  if(cartToggle) cartToggle.onclick = ()=> cartDrawer.classList.toggle('show');
  updateCartUI();
  if(sendOrderBtn) sendOrderBtn.onclick = sendCartOrder;

  // admin & home & dark
  if(adminBtn) adminBtn.onclick = ()=> location.href = "/dashboard/index.html";
  if(homeBtn) homeBtn.onclick = ()=> { // reset filters and show all
    searchBox.value=''; weightFrom.value=''; weightTo.value=''; rangeMin.value=0; rangeMax.value=SLIDER_MAX; currentTab='all';
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    const allTab = document.querySelector('.tab[data-type="all"]');
    if(allTab) allTab.classList.add('active');
    currentPage = 1; applyFiltersAndRender();
  }
  if(darkToggle) {
    darkToggle.onclick = ()=> {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('slns_dark', document.documentElement.classList.contains('dark') ? '1' : '0');
    };
    if(localStorage.getItem('slns_dark')==='1') document.documentElement.classList.add('dark');
  }

  // modal events
  if(modalClose) modalClose.onclick = ()=> modal.hidden = true;
  if(modalPrev) modalPrev.onclick = ()=> showModal(-1);
  if(modalNext) modalNext.onclick = ()=> showModal(1);
  if(modal){
    modal.addEventListener('click', e=> { if(e.target === modal) modal.hidden = true; });
    document.addEventListener('keydown', e=> {
      if(modal.hidden) return;
      if(e.key === 'Escape') modal.hidden = true;
      if(e.key === 'ArrowLeft') showModal(-1);
      if(e.key === 'ArrowRight') showModal(1);
    });
  }

  // try register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{/* ignore */});
  }
}

/* ====== Apply filters and probe images ====== */
function applyFiltersAndRender(){
  const q = (searchBox && searchBox.value || '').trim().toLowerCase();
  const minW = parseFloat((weightFrom && weightFrom.value) || '');
  const maxW = parseFloat((weightTo && weightTo.value) || '');
  const weightActive = (weightFrom && weightFrom.value) || (weightTo && weightTo.value);

  displayed = allItems.filter(it=>{
    if(currentTab !== 'all' && it.type !== currentTab) return false;
    if(q && !(it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) return false;
    const w = weights[it.id.toLowerCase()];
    if(weightActive){
      if(w === undefined) return false;
      if(!(w >= (isNaN(minW) ? -Infinity : minW) && w <= (isNaN(maxW) ? Infinity : maxW))) return false;
    }
    return true;
  });

  // probe existence
  validList = [];
  let pending = displayed.length;
  if(pending === 0){
    renderGallery();
    return;
  }
  displayed.forEach(it=>{
    const img = new Image();
    img.src = it.src;
    img.onload = ()=> { validList.push(it); if(--pending === 0) renderGallery(); };
    img.onerror = ()=> { if(--pending === 0) renderGallery(); };
  });
}

/* ====== Render gallery with pagination & lazy load ====== */
function renderGallery(){
  if(!gallery) return;
  gallery.innerHTML = '';
  if(validList.length === 0){
    if(noImages) noImages.hidden = false;
    pagination.innerHTML = '';
    return;
  }
  if(noImages) noImages.hidden = true;

  const total = validList.length;
  const totalPages = Math.max(1, Math.ceil(total/itemsPerPage));
  if(currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = validList.slice(start, start + itemsPerPage);

  pageItems.forEach((it, idx)=>{
    const card = document.createElement('div'); card.className = 'card';
    const wrap = document.createElement('div'); wrap.className = 'imgwrap';
    const img = document.createElement('img');
    img.dataset.src = it.src;
    img.alt = it.name;
    img.loading = 'lazy';
    img.addEventListener('load', ()=> img.classList.add('loaded'));
    img.addEventListener('error', ()=> img.classList.add('loaded'));
    wrap.appendChild(img);

    const meta = document.createElement('div'); meta.className = 'meta';
    const name = document.createElement('div'); name.className = 'name'; name.textContent = it.name;
    const wval = weights[it.id.toLowerCase()];
    const weightDiv = document.createElement('div'); weightDiv.className = 'weight'; weightDiv.textContent = wval ? `${round3(wval)} g` : '';
    meta.appendChild(name); meta.appendChild(weightDiv);

    const add = document.createElement('button'); add.className = 'add'; add.textContent = 'Add';
    add.onclick = (e)=> { e.stopPropagation(); addToCart(it); };

    card.appendChild(wrap); card.appendChild(meta); card.appendChild(add);

    // clicking opens modal (global index in validList)
    const globalIndex = start + idx;
    card.onclick = ()=> openModal(globalIndex);

    gallery.appendChild(card);

    // lazy load small timeout for progressive feel
    setTimeout(()=> { img.src = img.dataset.src; }, 50);
  });

  // pagination
  renderPagination(totalPages);
}

/* ====== Pagination ====== */
function renderPagination(totalPages){
  pagination.innerHTML = '';
  for(let p=1;p<=totalPages;p++){
    const b = document.createElement('button'); b.className='tab'; b.textContent = p;
    if(p===currentPage) b.classList.add('active');
    b.onclick = ()=> { currentPage = p; renderGallery(); window.scrollTo({top:0,behavior:'smooth'}); };
    pagination.appendChild(b);
  }
}

/* ====== Modal functions ====== */
function openModal(index){
  currentModalIndex = index;
  updateModal();
  if(modal) modal.hidden = false;
}

function updateModal(){
  const item = validList[currentModalIndex];
  if(!item) return;
  if(modalImg) modalImg.src = item.src;
  const w = weights[item.id.toLowerCase()];
  if(modalInfo) modalInfo.textContent = w ? `${item.name} — ${round3(w)} g` : item.name;
  if(orderBtn) orderBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("I want to order "+item.name+(w?` — ${round3(w)} g`:""))}`;
}

function showModal(delta){
  if(!validList.length) return;
  currentModalIndex = (currentModalIndex + delta + validList.length) % validList.length;
  updateModal();
}

/* ====== Cart ====== */
function addToCart(item){
  const existing = cart.find(c=>c.id === item.id);
  if(existing) existing.qty = (existing.qty||1) + 1;
  else cart.push({ id: item.id, name: item.name, src: item.src, weight: weights[item.id.toLowerCase()]||null, qty: 1 });
  localStorage.setItem('slns_cart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI(){
  if(!cartItemsEl || !cartCount) return;
  cartItemsEl.innerHTML = '';
  const totalQty = cart.reduce((s,i)=>s + (i.qty||0), 0);
  cartCount.textContent = totalQty;
  cart.forEach(ci=>{
    const el = document.createElement('div'); el.className = 'cart-item';
    el.innerHTML = `<div><strong>${ci.name}</strong><div class="small">${ci.weight?round3(ci.weight)+' g':''}</div></div><div class="small">x${ci.qty}</div>`;
    cartItemsEl.appendChild(el);
  });
  const summary = document.getElementById('cartSummary');
  if(summary) summary.textContent = `${totalQty} items`;
}

function sendCartOrder(){
  if(!cart.length) { alert('Cart is empty'); return; }
  let text = `Order from SLNS:%0A`;
  cart.forEach(ci => text += `- ${ci.name}${ci.weight?` (${round3(ci.weight)} g)`:""} x${ci.qty}%0A`);
  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/* ====== Manual sync placeholder ====== */
function manualSync(){
  applyFiltersAndRender();
  alert('Manual sync done (placeholder). To enable auto-sync provide admin/API details).');
}

/* ====== Expose small API for debugging in console ====== */
window._SLNS = {
  applyFiltersAndRender,
  addToCart,
  getValid: ()=> validList,
  weights
};

/* ====== END ====== */

/* script-v7.js — V7 w/ Infinite Scroll & modal fixes
   - Infinite scroll replaces pagination
   - Modal won't auto-open on load
   - Close button / overlay / ESC / Prev/Next fixed
   - Order (WhatsApp) only opens on user clicks
*/

// SAFETY: prevent auto-popups from old/deployed code until user interacts
(function(){
  if(window.__slns_open_guard) return;
  window.__slns_open_guard = true;
  const origOpen = window.open.bind(window);
  let userInteracted = false;
  const allow = ()=>{ userInteracted = true; window.removeEventListener('click', allow); window.removeEventListener('keydown', allow); };
  window.addEventListener('click', allow, {once:true});
  window.addEventListener('keydown', allow, {once:true});
  window.open = function(url, name, specs){
    if(!userInteracted){
      console.warn('Blocked automatic window.open to', url);
      return null;
    }
    return origOpen(url, name, specs);
  };
})();


document.addEventListener("DOMContentLoaded", () => {
  /* ====== CONFIG ====== */
  const metals = ["gold"];
  const types = ["all","bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
  const maxImages = 100;
  const imagesPath = "images";
  const weightsFile = "weights.json";
  const itemsPerPage = 12;    // batch size for infinite scroll
  const SLIDER_MAX = 250;
  const waNumber = "917780220369";

  /* ====== DOM ====== */
  const yearEl = document.getElementById("year");
  const categoryBar = document.getElementById("categoryBar");
  const gallery = document.getElementById("gallery");
  const noImages = document.getElementById("noImages");
  const searchBox = document.getElementById("searchBox");
  const filterPanel = document.getElementById("filterPanel");
  const menuToggle = document.getElementById("menuToggle");
  const applyFilters = document.getElementById("applyFilters");
  const clearFilters = document.getElementById("clearFilters");
  const weightFrom = document.getElementById("weightFrom");
  const weightTo = document.getElementById("weightTo");
  const rangeMin = document.getElementById("rangeMin");
  const rangeMax = document.getElementById("rangeMax");

  const cartToggle = document.getElementById("cartToggle");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartItemsEl = document.getElementById("cartItems");
  const cartCountEl = document.getElementById("cartCount");
  const cartSummaryEl = document.getElementById("cartSummary");
  const sendOrderBtn = document.getElementById("sendOrder");

  const modal = document.getElementById("overlayModal");
  const modalImg = document.getElementById("modalImg");
  const modalInfo = document.getElementById("modalInfo");
  const modalPrev = document.getElementById("modalPrev");
  const modalNext = document.getElementById("modalNext");
  const modalClose = document.getElementById("modalClose");
  const orderBtn = document.getElementById("orderBtn");

  const darkToggle = document.getElementById("darkToggle");
  const homeBtn = document.getElementById("homeBtn");
  const adminBtn = document.getElementById("adminBtn");

  /* ====== STATE ====== */
  let allItems = [];       // master
  let weights = {};        // id -> weight
  let filtered = [];       // after filters
  let visible = [];        // after image existence probe
  let currentCategory = "all";
  let loadedCount = 0;     // how many visible items are appended to the DOM
  let currentModalIndex = -1;
  let cart = JSON.parse(localStorage.getItem("slns_cart")||"[]");

  /* ====== HELPERS ====== */
  const cap = s => s ? s[0].toUpperCase()+s.slice(1) : s;
  const debounce = (fn,ms=180)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const clamp = (v,a,b)=> Math.max(a,Math.min(b,v));
  const round3 = v => Math.round(v*1000)/1000;

  /* ====== Build master list ====== */
  (function build(){
    for(const m of metals){
      for(const t of types){
        if(t === "all") continue;
        for(let i=1;i<=maxImages;i++){
          const id = `${m}_${t}${i}`;
          allItems.push({ id, src:`${imagesPath}/${id}.jpg`, name:`${cap(t)} ${i}`, type:t });
        }
      }
    }
  })();

  /* ====== Load weights.json (optional) + parse from filenames fallback ====== */
  fetch(weightsFile).then(r=>{
    if(!r.ok) throw new Error("no weights");
    return r.json();
  }).then(j=>{
    Object.keys(j||{}).forEach(k=> weights[k.toLowerCase()] = j[k]);
  }).catch(()=>{/* ok if missing */})
  .finally(()=>{
    // parse weights from filenames if not present
    allItems.forEach(it=>{
      if(weights[it.id.toLowerCase()] === undefined){
        const p = parseWeightFromFilename(it.src);
        if(p !== undefined) weights[it.id.toLowerCase()] = p;
      }
    });
    initUI();
    applyFiltersAndStart();
  });

  function parseWeightFromFilename(src){
    const name = src.split('/').pop();
    const m = name.match(/_(\d+(?:\.\d+))(?=\.[a-zA-Z]{2,4}$)/);
    return m ? parseFloat(m[1]) : undefined;
  }

  /* ====== UI init ====== */
  function initUI(){
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    buildCategoryBar();

    // filter panel toggle
    if(menuToggle && filterPanel){
      menuToggle.addEventListener("click", ()=> filterPanel.classList.toggle("show"));
      document.addEventListener("click", e=>{
        if(!filterPanel.contains(e.target) && e.target !== menuToggle) filterPanel.classList.remove("show");
      });
    }

    // search
    if(searchBox) searchBox.addEventListener("input", debounce(()=>{ loadedCount=0; applyFiltersAndStart(); }, 200));

    // weight inputs
    if(rangeMin && rangeMax){
      rangeMin.value = 0; rangeMax.value = SLIDER_MAX;
      rangeMin.addEventListener("input", ()=>{ if(+rangeMin.value>+rangeMax.value) rangeMax.value = rangeMin.value; if(weightFrom) weightFrom.value = round3(rangeMin.value); });
      rangeMax.addEventListener("input", ()=>{ if(+rangeMax.value<+rangeMin.value) rangeMin.value = rangeMax.value; if(weightTo) weightTo.value = round3(rangeMax.value); });
    }
    if(weightFrom) weightFrom.addEventListener("input", ()=> rangeMin.value = clamp(+weightFrom.value||0, 0, SLIDER_MAX));
    if(weightTo) weightTo.addEventListener("input", ()=> rangeMax.value = clamp(+weightTo.value||0, 0, SLIDER_MAX));

    if(applyFilters) applyFilters.addEventListener("click", ()=>{ loadedCount=0; applyFiltersAndStart(); filterPanel.classList.remove("show"); });
    if(clearFilters) clearFilters.addEventListener("click", ()=>{ if(searchBox) searchBox.value=""; if(weightFrom) weightFrom.value=""; if(weightTo) weightTo.value=""; if(rangeMin) rangeMin.value=0; if(rangeMax) rangeMax.value=SLIDER_MAX; loadedCount=0; applyFiltersAndStart(); });

    // home/admin
    if(homeBtn) homeBtn.addEventListener("click", ()=>{ if(searchBox) searchBox.value=""; if(weightFrom) weightFrom.value=""; if(weightTo) weightTo.value=""; if(rangeMin) rangeMin.value=0; if(rangeMax) rangeMax.value=SLIDER_MAX; currentCategory='all'; setActiveCategoryDom('all'); loadedCount=0; applyFiltersAndStart(); });
    if(adminBtn) adminBtn.addEventListener("click", ()=> location.href="/dashboard/index.html");

    // cart
    if(cartToggle && cartDrawer) cartToggle.addEventListener("click", ()=> cartDrawer.classList.toggle("open"));
    updateCartUI();

    if(sendOrderBtn) sendOrderBtn.addEventListener("click", sendCartOrder);

    // modal safe handlers
    if(modalClose) modalClose.addEventListener("click", e=>{ e.stopPropagation(); closeModal(); });
    if(modal) modal.addEventListener("click", e=> { if(e.target === modal) closeModal(); });
    if(modalPrev) modalPrev.addEventListener("click", ()=> showModal(-1));
    if(modalNext) modalNext.addEventListener("click", ()=> showModal(1));

    document.addEventListener("keydown", e=>{
      if(!modal || modal.hidden) return;
      if(e.key === "Escape") closeModal();
      if(e.key === "ArrowLeft") showModal(-1);
      if(e.key === "ArrowRight") showModal(1);
    });

    // dark toggle
    if(darkToggle){
      darkToggle.addEventListener("click", ()=>{ document.body.classList.toggle("dark"); localStorage.setItem("slns_dark", document.body.classList.contains("dark") ? "1" : "0"); });
      if(localStorage.getItem("slns_dark")==="1") document.body.classList.add("dark");
    }

    // infinite scroll listener
    window.addEventListener("scroll", throttle(handleScroll, 150));
  }

  /* ====== CATEGORY BAR (icons) ====== */
  function buildCategoryBar(){
    if(!categoryBar) return;
    categoryBar.innerHTML = "";
    const cats = ["all", ...types];
    cats.forEach(cat=>{
      const item = document.createElement("div");
      item.className = "category-item";
      item.dataset.cat = cat;

      const imgWrap = document.createElement("div");
      imgWrap.className = "cat-img-wrap";
      const img = document.createElement("img");
      img.src = `${imagesPath}/cat/${cat}.jpg`;
      img.alt = cat;
      img.loading = "lazy";
      img.onerror = ()=>{ img.src = `${imagesPath}/cat/all.jpg`; };
      imgWrap.appendChild(img);

      const label = document.createElement("div");
      label.className = "cat-label";
      label.textContent = cap(cat);

      item.appendChild(imgWrap);
      item.appendChild(label);

      item.addEventListener("click", ()=>{
        setActiveCategoryDom(cat);
        currentCategory = cat;
        loadedCount = 0;
        applyFiltersAndStart();
      });

      categoryBar.appendChild(item);
    });
    // default active
    setActiveCategoryDom(currentCategory);
  }

  function setActiveCategoryDom(cat){
    if(!categoryBar) return;
    categoryBar.querySelectorAll(".category-item").forEach(x=>x.classList.remove("active"));
    const el = categoryBar.querySelector(`.category-item[data-cat="${cat}"]`);
    if(el) el.classList.add("active");
  }

  /* ====== FILTER -> PROBE -> RENDER (infinite scroll batches) ====== */
  function applyFiltersAndStart(){
    // build filtered list
    const q = (searchBox && searchBox.value || "").trim().toLowerCase();
    const minW = parseFloat((weightFrom && weightFrom.value) || "");
    const maxW = parseFloat((weightTo && weightTo.value) || "");
    const weightActive = (weightFrom && weightFrom.value) || (weightTo && weightTo.value);

    filtered = allItems.filter(it=>{
      if(currentCategory !== "all" && it.type !== currentCategory) return false;
      if(q && !(it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) return false;
      if(weightActive){
        const w = weights[it.id.toLowerCase()];
        if(w === undefined || w === null) return false;
        if(!(w >= (isNaN(minW)?-Infinity:minW) && w <= (isNaN(maxW)?Infinity:maxW))) return false;
      }
      return true;
    });

    // probe existence
    probeImagesExistence(filtered).then(list=>{
      visible = list;
      // reset gallery and loadedCount then load first batch
      gallery.innerHTML = "";
      loadedCount = 0;
      if(visible.length === 0){
        if(noImages) noImages.hidden = false;
      } else {
        if(noImages) noImages.hidden = true;
        loadNextBatch(); // append first batch
      }
    });
  }

  function probeImagesExistence(list){
    return new Promise(resolve=>{
      if(!list || list.length === 0) return resolve([]);
      const ok = [];
      let pending = list.length;
      list.forEach(it=>{
        const img = new Image();
        img.src = it.src;
        img.onload = ()=>{ ok.push(it); if(--pending===0) resolve(ok); };
        img.onerror = ()=>{ if(--pending===0) resolve(ok); };
      });
    });
  }

  /* ====== BATCH LOADER (infinite scroll) ====== */
  function loadNextBatch(){
    if(!visible || loadedCount >= visible.length) return;
    const start = loadedCount;
    const end = Math.min(visible.length, loadedCount + itemsPerPage);
    const batch = visible.slice(start, end);

    batch.forEach((it, idx)=>{
      const card = document.createElement("div");
      card.className = "card";

      const wrap = document.createElement("div");
      wrap.className = "imgwrap";

      const img = document.createElement("img");
      img.dataset.src = it.src;
      img.alt = it.name;
      img.loading = "lazy";
      img.addEventListener("load", ()=> img.classList.add("loaded"));
      img.addEventListener("error", ()=> img.classList.add("loaded"));

      wrap.appendChild(img);

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = it.name;

      const wdiv = document.createElement("div");
      wdiv.className = "weight";
      const w = weights[it.id.toLowerCase()];
      wdiv.textContent = w ? `${round3(w)} g` : "";

      const addBtn = document.createElement("button");
      addBtn.className = "add";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", (e)=>{
        e.stopPropagation(); // prevent card click
        addToCart(it);
      });

      // set data-index relative to visible array
      const globalIndex = start + idx;
      card.dataset.index = String(globalIndex);

      card.addEventListener("click", ()=> {
        // open modal for that visible index
        openModal(globalIndex);
      });

      card.appendChild(wrap);
      card.appendChild(name);
      card.appendChild(wdiv);
      card.appendChild(addBtn);

      gallery.appendChild(card);

      // lazy-load
      observeLazyImage(img);
    });

    loadedCount = end;
  }

  /* ====== infinite-scroll handler ====== */
  function handleScroll(){
    // near bottom?
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 500);
    if(nearBottom) loadNextBatch();
  }
  function throttle(fn, ms=150){
    let t = 0;
    return (...a)=>{
      const now = Date.now();
      if(now - t > ms){ t = now; fn(...a); }
    };
  }

  /* ====== Lazy loader (IntersectionObserver) ====== */
  const imgObserver = ("IntersectionObserver" in window) ? new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const img = entry.target;
        if(img.dataset && img.dataset.src) img.src = img.dataset.src;
        imgObserver.unobserve(img);
      }
    });
  }, { rootMargin: "200px" }) : null;

  function observeLazyImage(img){
    if(!imgObserver){ if(img.dataset && img.dataset.src) img.src = img.dataset.src; return; }
    imgObserver.observe(img);
  }

  /* ====== MODAL (fixed) ====== */
  function openModal(visibleIndex){
    currentModalIndex = visibleIndex;
    updateModal();
    if(modal){ modal.hidden = false; modal.classList.add("open"); }
  }

  function closeModal(){
    if(modal){ modal.hidden = true; modal.classList.remove("open"); }
  }

  function showModal(step){
    if(!visible || visible.length === 0) return;
    currentModalIndex = (currentModalIndex + step + visible.length) % visible.length;
    updateModal();
  }

  function updateModal(){
    const it = visible[currentModalIndex];
    if(!it) return;
    if(modalImg) modalImg.src = it.src;
    if(modalInfo){
      const w = weights[it.id.toLowerCase()];
      modalInfo.textContent = w ? `${it.name} — ${round3(w)} g` : it.name;
    }
    if(orderBtn){
      // set href only; do not open until user clicks
      orderBtn.onclick = (e)=>{
        e.stopPropagation();
        const msg = `I want to order ${it.name}${weights[it.id.toLowerCase()]?` — ${round3(weights[it.id.toLowerCase()])} g`:""}`;
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
      };
    }
  }

  /* ====== CART ====== */
  function addToCart(it){
    cart.push({ id: it.id, name: it.name, weight: weights[it.id.toLowerCase()]||null, qty: 1 });
    persistCart();
    updateCartUI();
  }
  function persistCart(){ localStorage.setItem("slns_cart", JSON.stringify(cart)); }
  function updateCartUI(){
    if(!cartItemsEl || !cartCountEl || !cartSummaryEl) return;
    cartItemsEl.innerHTML = "";
    const totalQty = cart.reduce((s,i)=> s + (i.qty||1), 0);
    cartCountEl.textContent = totalQty;
    cart.forEach((ci, i)=>{
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `<div><strong>${ci.name}</strong><div class="small">${ci.weight?round3(ci.weight)+' g': ''}</div></div>
                       <div class="small">x${ci.qty}</div>`;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.addEventListener("click", ()=>{ cart.splice(i,1); persistCart(); updateCartUI(); });
      row.appendChild(del);
      cartItemsEl.appendChild(row);
    });
    if(cartSummaryEl) cartSummaryEl.textContent = `${totalQty} items`;
  }
  function sendCartOrder(){
    if(!cart || cart.length===0){ alert("Cart empty"); return; }
    let text = "Order from SLNS:%0A";
    cart.forEach(ci=> text += `- ${ci.name}${ci.weight?` (${round3(ci.weight)} g)`:""} x${ci.qty}%0A`);
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
  }
  if(sendOrderBtn) sendOrderBtn.addEventListener("click", sendCartOrder);

  /* ====== UTILS ====== */
  function cap(s){ return s? s[0].toUpperCase()+s.slice(1): s; }
  function round3(v){ return Math.round(v*1000)/1000; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  /* ====== Start: apply initial filters and render first batch ====== */
  function applyFiltersAndStart(){
    loadedCount = 0;
    applyFiltersAndRender();
  }

  function applyFiltersAndRender(){
    const q = (searchBox && searchBox.value || "").trim().toLowerCase();
    const minW = parseFloat((weightFrom && weightFrom.value) || "");
    const maxW = parseFloat((weightTo && weightTo.value) || "");
    const weightActive = (weightFrom && weightFrom.value) || (weightTo && weightTo.value);

    filtered = allItems.filter(it=>{
      if(currentCategory !== "all" && it.type !== currentCategory) return false;
      if(q && !(it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) return false;
      if(weightActive){
        const w = weights[it.id.toLowerCase()];
        if(w === undefined || w === null) return false;
        if(!(w >= (isNaN(minW)?-Infinity:minW) && w <= (isNaN(maxW)?Infinity:maxW))) return false;
      }
      return true;
    });

    // probe existence
    probeImagesExistence(filtered).then(list=>{
      visible = list;
      gallery.innerHTML = "";
      loadedCount = 0;
      if(visible.length === 0){
        if(noImages) noImages.hidden = false;
      } else {
        if(noImages) noImages.hidden = true;
        loadNextBatch();
      }
    });
  }

  function probeImagesExistence(list){
    return new Promise(resolve=>{
      if(!list || list.length===0) return resolve([]);
      const ok = [];
      let pending = list.length;
      list.forEach(it=>{
        const img = new Image();
        img.src = it.src;
        img.onload = ()=>{ ok.push(it); if(--pending===0) resolve(ok); };
        img.onerror = ()=>{ if(--pending===0) resolve(ok); };
      });
    });
  }

  /* ====== load initial UI and listeners ====== */
  initUI();
  // set cart from storage
  try { const saved = JSON.parse(localStorage.getItem("slns_cart")||"[]"); if(Array.isArray(saved)) cart = saved; } catch(e){ cart = []; }
  updateCartUI();

  // helper: expose for debug
  window._slns = { allItems, filtered, visible, weights, applyFiltersAndStart, addToCart };

  // done
}); // end DOMContentLoaded


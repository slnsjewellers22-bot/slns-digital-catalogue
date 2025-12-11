/* script-v7.js - SLNS V7 final
   Full, ready-to-use. Replace entire file with this.
*/
document.addEventListener("DOMContentLoaded", () => {
  /* ====== CONFIG ====== */
  const metals = ["gold"];
  const types = ["all","bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
  const maxImages = 100;                 // how many per type to probe
  const imagesPath = "images";
  const weightsFile = "weights.json";
  const itemsPerPage = 12;
  const SLIDER_MAX = 250;
  const waNumber = "917780220369";

  // Category icons (optional): user can place images in images/cat/<type>.jpg
  const CATEGORY_ICONS = {
    all: `${imagesPath}/cat/all.jpg`,
    bangles: `${imagesPath}/cat/bangles.jpg`,
    bracelet: `${imagesPath}/cat/bracelet.jpg`,
    chain: `${imagesPath}/cat/chain.jpg`,
    chandraharalu: `${imagesPath}/cat/chandraharalu.jpg`,
    earring: `${imagesPath}/cat/earring.jpg`,
    kada: `${imagesPath}/cat/kada.jpg`,
    locket: `${imagesPath}/cat/locket.jpg`,
    necklace: `${imagesPath}/cat/necklace.jpg`,
    npchains: `${imagesPath}/cat/npchains.jpg`,
    ring: `${imagesPath}/cat/ring.jpg`
  };

  /* ====== DOM ====== */
  const yearEl = document.getElementById("year");
  const categoryBar = document.getElementById("categoryBar");
  const categoryTabs = document.getElementById("categoryTabs"); // kept for compatibility, not used for UI
  const gallery = document.getElementById("gallery");
  const noImages = document.getElementById("noImages");
  const pagination = document.getElementById("pagination");

  const searchBox = document.getElementById("searchBox");
  const filterPanel = document.getElementById("filterPanel");
  const menuToggle = document.getElementById("menuToggle");
  const applyFilters = document.getElementById("applyFilters");
  const clearFilters = document.getElementById("clearFilters");

  const weightFrom = document.getElementById("weightFrom");
  const weightTo = document.getElementById("weightTo");
  const rangeMin = document.getElementById("rangeMin");
  const rangeMax = document.getElementById("rangeMax");

  const homeBtn = document.getElementById("homeBtn");
  const adminBtn = document.getElementById("adminBtn");
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

  /* ====== STATE ====== */
  let allItems = [];       // master list of items (id, src, name, type)
  let weights = {};        // id -> weight
  let filtered = [];       // filtered list (before existence check)
  let visible = [];        // items that exist (after probing)
  let currentCategory = "all";
  let currentPage = 1;
  let currentModalIndex = -1;
  let cart = JSON.parse(localStorage.getItem("slns_cart") || "[]");

  /* ====== HELPERS ====== */
  const cap = s => (s && s[0].toUpperCase()+s.slice(1)) || s;
  const debounce = (fn, ms=180) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const round3 = v => Math.round(v*1000)/1000;

  /* ====== BUILD MASTER LIST ====== */
  (function buildList(){
    allItems = [];
    for(const m of metals){
      for(const t of types){
        if(t === "all") continue;
        for(let i=1;i<=maxImages;i++){
          const id = `${m}_${t}${i}`;
          allItems.push({
            id,
            src: `${imagesPath}/${id}.jpg`,
            name: `${cap(t)} ${i}`,
            type: t
          });
        }
      }
    }
  })();

  /* ====== LOAD WEIGHTS (weights.json optional) ====== */
  fetch(weightsFile).then(r=>{
    if(!r.ok) throw new Error("no weights file");
    return r.json();
  }).then(j=>{
    Object.keys(j).forEach(k => weights[k.toLowerCase()] = j[k]);
  }).catch(()=>{ /* missing weights.json is ok */ })
  .finally(()=>{
    // parse weight from filenames (like gold_ring1_15.750.jpg) if not present in weights.json
    allItems.forEach(it=>{
      if(weights[it.id.toLowerCase()] === undefined){
        const parsed = parseWeightFromFilename(it.src);
        if(parsed !== undefined) weights[it.id.toLowerCase()] = parsed;
      }
    });
    initUI();
    applyFiltersAndRender();
  });

  function parseWeightFromFilename(src){
    const name = src.split("/").pop();
    const m = name.match(/_(\d+(?:\.\d+))(?=\.[a-zA-Z]{2,4}$)/);
    return m ? parseFloat(m[1]) : undefined;
  }

  /* ====== INIT UI ====== */
  function initUI(){
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    buildCategoryBar();

    // menu toggle (filter panel)
    if(menuToggle && filterPanel){
      menuToggle.addEventListener("click", ()=> filterPanel.classList.toggle("show"));
      document.addEventListener("click", (e)=>{
        if(!filterPanel.contains(e.target) && e.target !== menuToggle) filterPanel.classList.remove("show");
      });
    }

    // search
    if(searchBox) searchBox.addEventListener("input", debounce(()=>{ currentPage=1; applyFiltersAndRender(); }, 180));

    // weight slider sync
    if(rangeMin && rangeMax){
      rangeMin.value = 0;
      rangeMax.value = SLIDER_MAX;
      rangeMin.addEventListener("input", ()=>{ if(+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value; if(weightFrom) weightFrom.value = round3(rangeMin.value); });
      rangeMax.addEventListener("input", ()=>{ if(+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value; if(weightTo) weightTo.value = round3(rangeMax.value); });
    }
    if(weightFrom) weightFrom.addEventListener("input", ()=> rangeMin.value = clamp(+weightFrom.value||0, 0, SLIDER_MAX));
    if(weightTo) weightTo.addEventListener("input", ()=> rangeMax.value = clamp(+weightTo.value||0, 0, SLIDER_MAX));

    // apply / clear
    if(applyFilters) applyFilters.addEventListener("click", ()=>{ currentPage=1; filterPanel.classList.remove("show"); applyFiltersAndRender(); });
    if(clearFilters) clearFilters.addEventListener("click", ()=>{ if(searchBox) searchBox.value=""; if(weightFrom) weightFrom.value=""; if(weightTo) weightTo.value=""; if(rangeMin) rangeMin.value=0; if(rangeMax) rangeMax.value=SLIDER_MAX; currentPage=1; applyFiltersAndRender(); });

    // home & admin
    if(homeBtn) homeBtn.addEventListener("click", ()=>{ if(searchBox) searchBox.value=""; if(weightFrom) weightFrom.value=""; if(weightTo) weightTo.value=""; if(rangeMin) rangeMin.value=0; if(rangeMax) rangeMax.value=SLIDER_MAX; currentCategory="all"; setActiveCategoryDom("all"); currentPage=1; applyFiltersAndRender(); });
    if(adminBtn) adminBtn.addEventListener("click", ()=> window.location.href = "/dashboard/index.html");

    // cart toggle
    if(cartToggle && cartDrawer){
      cartToggle.addEventListener("click", ()=> cartDrawer.classList.toggle("open"));
    }
    updateCartUI();

    if(sendOrderBtn) sendOrderBtn.addEventListener("click", sendCartOrder);

    // modal events
    if(modalClose) modalClose.addEventListener("click", e=>{ e.stopPropagation(); closeModal(); });
    if(modal) modal.addEventListener("click", e=> { if(e.target === modal) closeModal(); });
    if(modalPrev) modalPrev.addEventListener("click", ()=> showModal(-1));
    if(modalNext) modalNext.addEventListener("click", ()=> showModal(1));
    document.addEventListener("keydown", e=>{
      if(modal && !modal.hidden){
        if(e.key === "Escape") closeModal();
        if(e.key === "ArrowLeft") showModal(-1);
        if(e.key === "ArrowRight") showModal(1);
      }
    });

    // dark toggle
    if(darkToggle){
      darkToggle.addEventListener("click", ()=> {
        document.body.classList.toggle("dark");
        localStorage.setItem("slns_dark", document.body.classList.contains("dark") ? "1" : "0");
      });
      if(localStorage.getItem("slns_dark")==="1") document.body.classList.add("dark");
    }
  }

  /* ====== BUILD CATEGORY BAR (circular icons) ====== */
  function buildCategoryBar(){
    if(!categoryBar) return;
    categoryBar.innerHTML = "";

    // user-visible order: put "all" first, then types (excluding "all")
    const cats = ["all", ...types.filter(t => t !== "all")];

    cats.forEach(cat=>{
      const item = document.createElement("div");
      item.className = "category-item";
      item.dataset.cat = cat;

      const imgWrap = document.createElement("div");
      imgWrap.className = "cat-img-wrap";

      const img = document.createElement("img");
      // attempt to use provided icon; fallback to placeholder if not present
      img.src = CATEGORY_ICONS[cat] || CATEGORY_ICONS['all'] || `${imagesPath}/cat/${cat}.jpg`;
      img.alt = cat;
      img.loading = "lazy";
      imgWrap.appendChild(img);

      const label = document.createElement("div");
      label.className = "cat-label";
      label.textContent = cap(cat);

      item.appendChild(imgWrap);
      item.appendChild(label);

      item.addEventListener("click", ()=>{
        // set active class visually
        document.querySelectorAll(".category-item").forEach(x=>x.classList.remove("active"));
        item.classList.add("active");

        // set current category and re-render
        currentCategory = cat;
        currentPage = 1;
        applyFiltersAndRender();
      });

      categoryBar.appendChild(item);
    });

    // set default active
    const first = categoryBar.querySelector(".category-item");
    if(first) first.classList.add("active");
  }

  function setActiveCategoryDom(cat){
    if(!categoryBar) return;
    document.querySelectorAll(".category-item").forEach(x=>x.classList.remove("active"));
    const el = categoryBar.querySelector(`.category-item[data-cat="${cat}"]`);
    if(el) el.classList.add("active");
  }

  /* ====== FILTER -> PROBE -> RENDER ====== */
  function applyFiltersAndRender(){
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

    probeImagesExistence(filtered).then(existingList=>{
      visible = existingList;
      currentPage = clamp(currentPage, 1, Math.max(1, Math.ceil(visible.length / itemsPerPage)));
      renderGallery();
    });
  }

  function probeImagesExistence(list){
    // returns Promise resolving to array of items whose src loads successfully
    return new Promise(resolve => {
      if(!list || list.length === 0) return resolve([]);
      const ok = [];
      let pending = list.length;
      list.forEach(it=>{
        const img = new Image();
        img.src = it.src;
        img.onload = ()=> { ok.push(it); if(--pending===0) resolve(ok); };
        img.onerror = ()=> { if(--pending===0) resolve(ok); };
      });
    });
  }

  /* ====== RENDER GALLERY ====== */
  function renderGallery(){
    if(!gallery) return;
    gallery.innerHTML = "";

    if(!visible || visible.length === 0){
      if(noImages) noImages.hidden = false;
      if(pagination) pagination.innerHTML = "";
      return;
    }
    if(noImages) noImages.hidden = true;

    const total = visible.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
    if(currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = visible.slice(start, start + itemsPerPage);

    pageItems.forEach((it, idx)=>{
      const card = document.createElement("div");
      card.className = "card";

      const wrap = document.createElement("div");
      wrap.className = "imgwrap";

      const img = document.createElement("img");
      img.dataset.src = it.src;
      img.alt = it.name;
      img.loading = "lazy";
      // blur -> remove on load via class
      img.addEventListener("load", ()=> img.classList.add("loaded"));
      img.addEventListener("error", ()=> img.classList.add("loaded"));

      wrap.appendChild(img);

      const name = document.createElement("div");
      name.className = "meta";
      name.textContent = it.name;

      const wdiv = document.createElement("div");
      wdiv.className = "weight";
      const w = weights[it.id.toLowerCase()];
      wdiv.textContent = w ? `${round3(w)} g` : "";

      const addBtn = document.createElement("button");
      addBtn.className = "add";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", (e)=>{
        e.stopPropagation();
        addToCart(it);
      });

      // clicking the card opens modal for this item index in visible array
      card.addEventListener("click", ()=> openModal(start + idx));

      // assemble
      card.appendChild(wrap);
      card.appendChild(name);
      card.appendChild(wdiv);
      card.appendChild(addBtn);

      gallery.appendChild(card);

      // lazy load
      observeLazyImage(img);
    });

    renderPagination(totalPages);
  }

  /* ====== PAGINATION ====== */
  function renderPagination(totalPages){
    if(!pagination) return;
    pagination.innerHTML = "";
    if(totalPages <= 1) return;

    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", ()=> { currentPage = Math.max(1, currentPage-1); renderGallery(); });
    pagination.appendChild(prev);

    for(let p=1;p<=totalPages;p++){
      const btn = document.createElement("button");
      btn.textContent = p;
      if(p === currentPage) btn.classList.add("active");
      btn.addEventListener("click", ()=> { currentPage = p; renderGallery(); });
      pagination.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", ()=> { currentPage = Math.min(totalPages, currentPage+1); renderGallery(); });
    pagination.appendChild(next);
  }

  /* ====== LAZY LOADER ====== */
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
    if(!imgObserver) { if(img.dataset && img.dataset.src) img.src = img.dataset.src; return; }
    imgObserver.observe(img);
  }

  /* ====== MODAL ====== */
  function openModal(globalIndex){
    currentModalIndex = globalIndex;
    updateModal();
    if(modal){
      modal.hidden = false;
      modal.classList.add("open");
    }
  }

  function closeModal(){
    if(modal){
      modal.hidden = true;
      modal.classList.remove("open");
    }
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
    if(orderBtn) orderBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("I want to order "+it.name+(weights[it.id.toLowerCase()]?` — ${round3(weights[it.id.toLowerCase())} g`:""))}`;
  }

  /* modal events set earlier in initUI - they handle stopPropagation on close */

  /* ====== CART ====== */
  function addToCart(it){
    cart.push({ id: it.id, name: it.name, qty: 1, weight: weights[it.id.toLowerCase()] || null });
    persistCart();
    updateCartUI();
  }

  function persistCart(){ localStorage.setItem("slns_cart", JSON.stringify(cart)); }
  function updateCartUI(){
    if(!cartItemsEl || !cartCountEl || !cartSummaryEl) return;
    cartItemsEl.innerHTML = "";
    const totalQty = cart.reduce((s,i)=>s + (i.qty||1), 0);
    cartCountEl.textContent = totalQty;
    cart.forEach((ci, i)=>{
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `<div><strong>${ci.name}</strong><div class="small">${ci.weight?round3(ci.weight)+" g":""}</div></div>
                       <div class="small">x${ci.qty}</div>
                       <button class="remove">✕</button>`;
      row.querySelector(".remove").addEventListener("click", ()=> { cart.splice(i,1); persistCart(); updateCartUI(); });
      cartItemsEl.appendChild(row);
    });
    cartSummaryEl.textContent = `${totalQty} items`;
  }

  function sendCartOrder(){
    if(!cart || cart.length === 0) { alert("Cart empty"); return; }
    let text = "Order from SLNS:%0A";
    cart.forEach(ci=> text += `- ${ci.name}${ci.weight?` (${round3(ci.weight)} g)`:""} x${ci.qty}%0A`);
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`);
  }
  if(sendOrderBtn) sendOrderBtn.addEventListener("click", sendCartOrder);

  /* ====== UTILS ====== */
  function debounceLocal(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  /* ====== INITIALIZE ====== */
  function applyFiltersAndRender(){ currentPage = 1; applyFiltersAndRenderInternal(); }
  function applyFiltersAndRenderInternal(){
    // wrapper to keep previous API name
    applyFiltersAndRenderLogic();
  }

  function applyFiltersAndRenderLogic(){
    // keep same as earlier with currentCategory
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

    probeImagesExistence(filtered).then(list=>{
      visible = list;
      currentPage = clamp(currentPage, 1, Math.max(1, Math.ceil(visible.length / itemsPerPage)));
      renderGallery();
    });
  }

  // alias for compatibility
  function applyFiltersAndRender() { applyFiltersAndRenderInternal(); }

  /* ====== INITIAL SETUP TASKS ====== */
  // Attach UI listeners already in initUI; call once
  // Set cart from storage
  try { const saved = JSON.parse(localStorage.getItem("slns_cart")||"[]"); if(Array.isArray(saved)) cart = saved; } catch(e){ cart = []; }
  updateCartUI();

  // Final: ensure no modal auto-open by not calling openModal anywhere on init
  // Kick off initial rendering (weights loaded above will call initUI then apply)
  // but if weights loaded earlier finished, ensure categoryBar exists
  // (initUI already called from fetch finally)

  /* ====== Safety: expose debug tools (optional) ====== */
  window._slns = {
    allItems, applyFiltersAndRender, addToCart, visible, weights
  };

}); // DOMContentLoaded end

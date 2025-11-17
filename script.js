// V6.3 - script.js (Modal Fix + Top Filters + Stability)
// -----------------------------------------------------

// CONFIG
const metals = ["gold"];
const types = ["bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
const maxImages = 100;
const imagesPath = "images";
const weightsFile = "weights.json";
const SLIDER_MAX = 250;
const itemsPerPage = 12;

// DOM REFERENCES
const gallery = document.getElementById("gallery");
const searchBox = document.getElementById("searchBox");
const weightFromInput = document.getElementById("weightFrom");
const weightToInput = document.getElementById("weightTo");
const rangeMin = document.getElementById("rangeMin");
const rangeMax = document.getElementById("rangeMax");
const clearFiltersBtn = document.getElementById("clearFilters");
const applyFiltersBtn = document.getElementById("applyFilters");
const homeBtn = document.getElementById("homeBtn");
const catWrap = document.getElementById("categoriesWrap");
const catSelectAll = document.getElementById("catSelectAll");
const paginationEl = document.getElementById("pagination");
const noImages = document.getElementById("noImages");
const yearEl = document.getElementById("year");

// MODAL
const overlayModal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalClose = document.getElementById("modalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const orderBtn = document.getElementById("orderBtn");

// STATE
let allItems = [];
let viewList = [];
let validViewList = [];
let weights = {};
let currentIndex = -1;
let currentPage = 1;

// BUILD ALL ITEMS
(function(){
  for (const m of metals) {
    for (const t of types) {
      for (let i = 1; i <= maxImages; i++) {
        const id = `${m}_${t}${i}`;
        allItems.push({
          id,
          src: `${imagesPath}/${id}.jpg`,
          name: `${capitalize(m)} ${capitalize(t)} ${i}`,
          metal: m,
          type: t
        });
      }
    }
  }
})();

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

// LOAD WEIGHTS
fetch(weightsFile)
.then(r=>r.json())
.then(data=>{
  Object.keys(data).forEach(k=> weights[k.toLowerCase()] = data[k]);
})
.catch(()=>{})
.finally(()=>{
  initUI();
  render();
});

// INIT UI
function initUI(){
  yearEl.textContent = new Date().getFullYear();

  // Build category checkboxes
  catWrap.innerHTML = "";
  types.forEach(t=>{
    const lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" class="filter-type" value="${t}" checked/> ${capitalize(t)}`;
    catWrap.appendChild(lbl);
  });

  // Select All Behavior
  catSelectAll.addEventListener("change", ()=>{
    document.querySelectorAll(".filter-type").forEach(cb => cb.checked = catSelectAll.checked);
  });

  catWrap.addEventListener("change", ()=>{
    const allChecked = [...document.querySelectorAll(".filter-type")].every(cb => cb.checked);
    catSelectAll.checked = allChecked;
  });

  // Search debounce
  searchBox.addEventListener("input", debounce(()=>{ currentPage = 1; render(); },150));

  clearFiltersBtn.addEventListener("click", resetFilters);
  applyFiltersBtn.addEventListener("click", ()=>{ currentPage = 1; render(); });
  homeBtn.addEventListener("click", resetFilters);

  // Weight handling
  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;

  rangeMin.addEventListener("input", ()=>{
    if(+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value;
    weightFromInput.value = round3(rangeMin.value);
  });

  rangeMax.addEventListener("input", ()=>{
    if(+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value;
    weightToInput.value = round3(rangeMax.value);
  });

  weightFromInput.addEventListener("input", ()=>{
    rangeMin.value = clamp(weightFromInput.value || 0, 0, SLIDER_MAX);
  });

  weightToInput.addEventListener("input", ()=>{
    rangeMax.value = clamp(weightToInput.value || 0, 0, SLIDER_MAX);
  });

  // Modal close buttons
  modalClose.addEventListener("click", closeModal);
  overlayModal.addEventListener("click", (e)=>{
    if(e.target === overlayModal) closeModal();
  });

  // Modal keyboard
  document.addEventListener("keydown", (e)=>{
    if(overlayModal.hidden) return;
    if(e.key === "Escape") closeModal();
    if(e.key === "ArrowLeft") showModal(-1);
    if(e.key === "ArrowRight") showModal(1);
  });

  modalPrev.addEventListener("click", ()=> showModal(-1));
  modalNext.addEventListener("click", ()=> showModal(1));
}

// RESET FILTERS
function resetFilters(){
  document.querySelectorAll(".filter-metal, .filter-type").forEach(cb=> cb.checked = true);
  catSelectAll.checked = true;
  searchBox.value = "";
  weightFromInput.value = "";
  weightToInput.value = "";
  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;
  currentPage = 1;
  render();
}

// MAIN RENDER
function render(){
  const q = searchBox.value.toLowerCase();
  const metalsSel = [...document.querySelectorAll(".filter-metal:checked")].map(x=>x.value);
  const typesSel = [...document.querySelectorAll(".filter-type:checked")].map(x=>x.value);

  const minW = parseFloat(weightFromInput.value);
  const maxW = parseFloat(weightToInput.value);
  const weightActive = !!weightFromInput.value || !!weightToInput.value;

  viewList = allItems.filter(it=>{
    if(!metalsSel.includes(it.metal)) return false;
    if(!typesSel.includes(it.type)) return false;
    if(q && !it.id.toLowerCase().includes(q) && !it.name.toLowerCase().includes(q)) return false;

    const w = weights[it.id.toLowerCase()];
    if(weightActive){
      if(w===undefined) return false;
      if(!(w >= (minW||0) && w <= (maxW||SLIDER_MAX))) return false;
    }
    return true;
  });

  checkImagesExist();
}

// ONLY EXISTING IMAGES
function checkImagesExist(){
  validViewList = [];
  let pending = viewList.length;

  if(pending === 0){
    updateGallery();
    return;
  }

  viewList.forEach(item=>{
    const img = new Image();
    img.src = item.src;
    img.onload = ()=>{ validViewList.push(item); if(--pending === 0) updateGallery(); };
    img.onerror = ()=>{ if(--pending === 0) updateGallery(); };
  });
}

// UPDATE GALLERY + PAGINATION
function updateGallery(){
  gallery.innerHTML = "";
  if(validViewList.length === 0){
    noImages.hidden = false;
    paginationEl.innerHTML = "";
    return;
  }
  noImages.hidden = true;

  const total = validViewList.length;
  const totalPages = Math.ceil(total / itemsPerPage);
  currentPage = clamp(currentPage, 1, totalPages);

  const start = (currentPage - 1) * itemsPerPage;
  const items = validViewList.slice(start, start + itemsPerPage);

  items.forEach((item, idx)=>{
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = item.src;
    img.loading = "lazy";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;

    const wDiv = document.createElement("div");
    wDiv.className = "weight";
    const w = weights[item.id.toLowerCase()];
    wDiv.textContent = w ? `${round3(w)} g` : "";

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(wDiv);

    // PASS SAFE INDEX – fixed for modal auto-open bug
    const globalIndex = start + idx;
    card.addEventListener("click", ()=> openModal(globalIndex));

    gallery.appendChild(card);
  });

  renderPagination(totalPages);
}

// PAGINATION
function renderPagination(totalPages){
  paginationEl.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "Prev";
  prev.className = "page-btn";
  prev.disabled = currentPage===1;
  prev.onclick = ()=>{ currentPage--; updateGallery(); };
  paginationEl.appendChild(prev);

  for(let p=1;p<=totalPages;p++){
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.className = "page-btn" + (p===currentPage ? " active" : "");
    btn.onclick = ()=>{ currentPage = p; updateGallery(); };
    paginationEl.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next";
  next.className = "page-btn";
  next.disabled = currentPage===totalPages;
  next.onclick = ()=>{ currentPage++; updateGallery(); };
  paginationEl.appendChild(next);
}

// MODAL FUNCTIONS
function openModal(index){
  if(index < 0 || index >= validViewList.length) return;  // SAFETY
  currentIndex = index;
  updateModal();
  overlayModal.hidden = false;
}

function updateModal(){
  const it = validViewList[currentIndex];
  if(!it) return;

  modalImg.src = it.src;
  const w = weights[it.id.toLowerCase()];
  modalInfo.textContent = w ? `${it.name} — ${round3(w)} g` : it.name;

  orderBtn.href =
    `https://wa.me/917780220369?text=${encodeURIComponent(`I want to order ${it.name}${w?` — ${round3(w)} g`:""}`)}`;
}

function showModal(delta){
  currentIndex = (currentIndex + delta + validViewList.length) % validViewList.length;
  updateModal();
}

function closeModal(){
  overlayModal.hidden = true;
  modalImg.src = "";
}

// HELPERS
function debounce(fn,ms){ let t; return(...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function round3(v){ return Math.round(v*1000)/1000; }

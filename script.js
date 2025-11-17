// V6.2 - script.js
// Config
const metals = ["gold"];
const types = ["bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
const maxImages = 100;        // adjust if you want more images per type
const imagesPath = "images";
const weightsFile = "weights.json";
const SLIDER_MAX = 250;
const itemsPerPage = 12;

// DOM
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

// Modal
const overlayModal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalClose = document.getElementById("modalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const orderBtn = document.getElementById("orderBtn");

// State
let allItems = [];
let viewList = [];
let validViewList = [];
let weights = {};
let currentIndex = 0;
let currentPage = 1;

// Build item list
(function(){
  for(const m of metals){
    for(const t of types){
      for(let i=1;i<=maxImages;i++){
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

// load weights.json
fetch(weightsFile).then(r=>{
  if(!r.ok) throw new Error('no weights');
  return r.json();
}).then(data=>{
  weights = {};
  Object.keys(data).forEach(k=> weights[k.toLowerCase()] = data[k]);
}).catch(()=> { weights = {}; })
.finally(()=>{ initUI(); render(); });

// UI init
function initUI(){
  yearEl.textContent = new Date().getFullYear();

  // populate category checkboxes
  catWrap.innerHTML = "";
  types.forEach(t=>{
    const lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" class="filter-type" value="${t}" checked/> ${capitalize(t)}`;
    catWrap.appendChild(lbl);
  });

  // select-all behavior
  catSelectAll.addEventListener("change", ()=>{
    const all = catSelectAll.checked;
    document.querySelectorAll(".filter-type").forEach(cb => cb.checked = all);
  });
  catWrap.addEventListener("change", ()=>{
    const all = Array.from(document.querySelectorAll(".filter-type")).every(cb=>cb.checked);
    catSelectAll.checked = all;
  });

  // search debounce
  searchBox.addEventListener("input", debounce(()=>{ currentPage = 1; render(); },150));

  applyFiltersBtn.addEventListener("click", ()=>{ currentPage = 1; render(); });
  clearFiltersBtn.addEventListener("click", resetFilters);
  homeBtn.addEventListener("click", resetFilters);

  rangeMin.addEventListener("input", ()=>{
    if(+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value;
    weightFromInput.value = round3(rangeMin.value);
    currentPage = 1; render();
  });
  rangeMax.addEventListener("input", ()=>{
    if(+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value;
    weightToInput.value = round3(rangeMax.value);
    currentPage = 1; render();
  });
  weightFromInput.addEventListener("input", ()=>{ rangeMin.value = clamp(+weightFromInput.value||0,0,SLIDER_MAX); currentPage=1; render(); });
  weightToInput.addEventListener("input", ()=>{ rangeMax.value = clamp(+weightToInput.value||0,0,SLIDER_MAX); currentPage=1; render(); });

  // modal keystrokes
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") closeModal();
    if(overlayModal.hasAttribute("hidden")) return;
    if(e.key === "ArrowLeft") showModal(-1);
    if(e.key === "ArrowRight") showModal(1);
  });

  // modal buttons
  modalClose.addEventListener("click", closeModal);
  modalPrev.addEventListener("click", ()=>showModal(-1));
  modalNext.addEventListener("click", ()=>showModal(1));
}

// reset filters
function resetFilters(){
  document.querySelectorAll(".filter-metal").forEach(cb=>cb.checked = true);
  document.querySelectorAll(".filter-type").forEach(cb=>cb.checked = true);
  catSelectAll.checked = true;
  searchBox.value = "";
  weightFromInput.value = "";
  weightToInput.value = "";
  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;
  currentPage = 1;
  render();
}

// render main
function render(){
  const q = (searchBox.value||"").toLowerCase().trim();
  const mSel = Array.from(document.querySelectorAll(".filter-metal:checked")).map(x=>x.value);
  const tSel = Array.from(document.querySelectorAll(".filter-type:checked")).map(x=>x.value);
  const minW = parseFloat(weightFromInput.value);
  const maxW = parseFloat(weightToInput.value);
  const weightActive = (weightFromInput.value.trim() !== "" || weightToInput.value.trim() !== "");

  viewList = allItems.filter(it=>{
    if(!mSel.includes(it.metal)) return false;
    if(!tSel.includes(it.type)) return false;
    if(q && !(it.id.toLowerCase().includes(q) || (it.name && it.name.toLowerCase().includes(q)))) return false;
    const w = weights[it.id.toLowerCase()];
    if(weightActive){
      if(w === undefined) return false;
      const min = isNaN(minW)? -Infinity : minW;
      const max = isNaN(maxW)? Infinity : maxW;
      if(!(w >= min && w <= max)) return false;
    }
    return true;
  });

  checkImagesExist();
}

// only show cards for existing images
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
    img.onload = ()=>{ validViewList.push(item); if(--pending===0) updateGallery(); };
    img.onerror = ()=>{ if(--pending===0) updateGallery(); };
  });
}

// update grid & pagination
function updateGallery(){
  gallery.innerHTML = "";
  if(validViewList.length === 0){
    noImages.hidden = false;
    paginationEl.innerHTML = "";
    return;
  }
  noImages.hidden = true;

  const total = validViewList.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = validViewList.slice(start, start + itemsPerPage);

  pageItems.forEach((item, idx)=>{
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = item.src;
    img.alt = item.name;
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;
    const wDiv = document.createElement("div");
    wDiv.className = "weight";
    const w = weights[item.id.toLowerCase()];
    wDiv.textContent = (w !== undefined) ? `${round3(w)} g` : "";
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(wDiv);
    // compute global index
    const globalIndex = start + idx;
    card.addEventListener("click", ()=> openModal(globalIndex));
    gallery.appendChild(card);
  });

  renderPagination(totalPages);
}

// pagination UI
function renderPagination(totalPages){
  paginationEl.innerHTML = "";
  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.textContent = "Prev";
  prev.disabled = (currentPage===1);
  prev.addEventListener("click", ()=>{ currentPage = Math.max(1, currentPage-1); updateGallery(); });
  paginationEl.appendChild(prev);

  const maxButtons = 7;
  let start = Math.max(1, currentPage - Math.floor(maxButtons/2));
  let end = Math.min(totalPages, start + maxButtons - 1);
  if(end - start < maxButtons -1) start = Math.max(1, end - maxButtons + 1);

  for(let p = start; p<=end; p++){
    const b = document.createElement("button");
    b.className = "page-btn" + (p===currentPage ? " active" : "");
    b.textContent = p;
    b.addEventListener("click", ()=>{ currentPage = p; updateGallery(); });
    paginationEl.appendChild(b);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.textContent = "Next";
  next.disabled = (currentPage===totalPages);
  next.addEventListener("click", ()=>{ currentPage = Math.min(totalPages, currentPage+1); updateGallery(); });
  paginationEl.appendChild(next);
}

// modal
function openModal(globalIndex){
  currentIndex = globalIndex;
  updateModal();
  overlayModal.removeAttribute("hidden");
}
function updateModal(){
  const it = validViewList[currentIndex];
  if(!it) return;
  modalImg.src = it.src;
  const w = weights[it.id.toLowerCase()];
  modalInfo.textContent = w !== undefined ? `${it.name} — ${round3(w)} g` : it.name;
  orderBtn.href = `https://wa.me/917780220369?text=${encodeURIComponent(`I want to order ${it.name}${w!==undefined?` — ${round3(w)} g`:""}`)}`;
}
function showModal(delta){
  if(validViewList.length===0) return;
  currentIndex = (currentIndex + delta + validViewList.length) % validViewList.length;
  updateModal();
}
function closeModal(){
  overlayModal.setAttribute("hidden", "");
  modalImg.src = "";
}

// helpers
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function round3(v){ return Math.round(v*1000)/1000; }

// init slider defaults
rangeMin.value = 0;
rangeMax.value = SLIDER_MAX;

// overlay click closes modal
overlayModal.addEventListener("click", (e)=>{
  if(e.target === overlayModal) closeModal();
});

// expose debug
window._SLNS = { allItems, getValid: ()=> validViewList };

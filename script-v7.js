/* ============================================================
   SLNS DIGITAL CATALOGUE — V7.1 STABLE
   ✔ No auto modal
   ✔ Category bar working
   ✔ Preview + Close + ESC fixed
============================================================ */

/* CONFIG */
const metals = ["gold"];
const types = [
  "bangles","bracelet","chain","chandraharalu",
  "earring","kada","locket","necklace","npchains","ring"
];
const maxImages = 100;
const imagesPath = "images";
const weightsFile = "weights.json";
const itemsPerPage = 12;
const WHATSAPP = "917780220369";

/* DOM */
const gallery = document.getElementById("gallery");
const searchBox = document.getElementById("searchBox");
const weightFromInput = document.getElementById("weightFrom");
const weightToInput = document.getElementById("weightTo");
const rangeMin = document.getElementById("rangeMin");
const rangeMax = document.getElementById("rangeMax");
const clearFiltersBtn = document.getElementById("clearFilters");
const applyFiltersBtn = document.getElementById("applyFilters");
const paginationEl = document.getElementById("pagination");
const noImages = document.getElementById("noImages");
const categoryBar = document.getElementById("categoryBar");
const yearEl = document.getElementById("year");

/* MODAL (MATCHES index.html) */
const modal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalClose = document.getElementById("modalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const orderBtn = document.getElementById("orderBtn");

/* STATE */
let weights = {};
let allItems = [];
let filteredItems = [];
let validItems = [];
let currentIndex = -1;
let currentPage = 1;
let activeCategory = "all";

/* BUILD ITEMS */
(function buildItems(){
  for (const m of metals) {
    for (const t of types) {
      for (let i=1;i<=maxImages;i++){
        const id = `${m}_${t}${i}`;
        allItems.push({
          id,
          type: t,
          src: `${imagesPath}/${id}.jpg`,
          name: `${t.toUpperCase()} ${i}`
        });
      }
    }
  }
})();

/* LOAD WEIGHTS */
fetch(weightsFile)
  .then(r=>r.json())
  .then(d=>weights=d||{})
  .catch(()=>weights={})
  .finally(()=>{
    buildCategoryBar();
    render();
    yearEl.textContent = new Date().getFullYear();
  });

/* CATEGORY BAR */
function buildCategoryBar(){
  categoryBar.innerHTML = "";
  ["all",...types].forEach(cat=>{
    const el = document.createElement("div");
    el.className = "category-item";
    el.dataset.cat = cat;

    el.innerHTML = `
      <div class="cat-img-wrap">
        <img src="images/cat/${cat}.jpg" alt="${cat}">
      </div>
      <div class="cat-label">${cat.toUpperCase()}</div>
    `;

    if(cat==="all") el.classList.add("active");

    el.onclick = ()=>{
      document.querySelectorAll(".category-item")
        .forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      activeCategory = cat;
      currentPage = 1;
      render();
    };

    categoryBar.appendChild(el);
  });
}

/* FILTER + RENDER */
function render(){
  const q = searchBox.value.toLowerCase();
  const from = parseFloat(weightFromInput.value);
  const to = parseFloat(weightToInput.value);

  filteredItems = allItems.filter(it=>{
    if(activeCategory!=="all" && it.type!==activeCategory) return false;
    if(q && !it.id.includes(q)) return false;

    const w = weights[it.id];
    if(!isNaN(from) && (!w || w<from)) return false;
    if(!isNaN(to) && (!w || w>to)) return false;

    return true;
  });

  checkImages();
}

/* CHECK IMAGE EXISTS */
function checkImages(){
  validItems = [];
  let pending = filteredItems.length;

  if(pending===0){
    updateGallery();
    return;
  }

  filteredItems.forEach(it=>{
    const img = new Image();
    img.src = it.src;
    img.onload = ()=>{ validItems.push(it); if(--pending===0) updateGallery(); };
    img.onerror = ()=>{ if(--pending===0) updateGallery(); };
  });
}

/* GALLERY */
function updateGallery(){
  gallery.innerHTML = "";

  if(validItems.length===0){
    noImages.hidden=false;
    paginationEl.innerHTML="";
    return;
  }

  noImages.hidden=true;
  const totalPages = Math.ceil(validItems.length/itemsPerPage);
  currentPage = Math.max(1,Math.min(currentPage,totalPages));

  const start = (currentPage-1)*itemsPerPage;
  const pageItems = validItems.slice(start,start+itemsPerPage);

  pageItems.forEach((it,i)=>{
    const card = document.createElement("div");
    card.className="card";
    const w = weights[it.id];

    card.innerHTML=`
      <img src="${it.src}">
      <div class="name">${it.name}</div>
      <div class="weight">${w? w+" g":""}</div>
    `;

    card.onclick = ()=>openModal(start+i);
    gallery.appendChild(card);
  });

  renderPagination(totalPages);
}

/* PAGINATION */
function renderPagination(total){
  paginationEl.innerHTML="";
  for(let i=1;i<=total;i++){
    const b=document.createElement("button");
    b.textContent=i;
    if(i===currentPage) b.classList.add("active");
    b.onclick=()=>{currentPage=i;updateGallery();};
    paginationEl.appendChild(b);
  }
}

/* ================= MODAL ================= */

modal.hidden = true;

function openModal(index){
  currentIndex=index;
  updateModal();
  modal.hidden=false;
}

function closeModal(){
  modal.hidden=true;
  modalImg.src="";
  modalInfo.textContent="";
  orderBtn.removeAttribute("href");
}

function updateModal(){
  const it = validItems[currentIndex];
  if(!it) return;

  modalImg.src = it.src;
  const w = weights[it.id];
  modalInfo.textContent = w? `${it.name} — ${w} g`: it.name;

  orderBtn.href =
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(it.name)}`;
}

modalClose.onclick = closeModal;
modalPrev.onclick = ()=>{
  currentIndex = (currentIndex-1+validItems.length)%validItems.length;
  updateModal();
};
modalNext.onclick = ()=>{
  currentIndex = (currentIndex+1)%validItems.length;
  updateModal();
};
modal.onclick = e=>{ if(e.target===modal) closeModal(); };

document.addEventListener("keydown",e=>{
  if(modal.hidden) return;
  if(e.key==="Escape") closeModal();
  if(e.key==="ArrowLeft") modalPrev.click();
  if(e.key==="ArrowRight") modalNext.click();
});

/* FILTER BUTTONS */
applyFiltersBtn.onclick=()=>{currentPage=1;render();};
clearFiltersBtn.onclick=()=>{
  searchBox.value="";
  weightFromInput.value="";
  weightToInput.value="";
  activeCategory="all";
  document.querySelectorAll(".category-item")
    .forEach(x=>x.classList.remove("active"));
  document.querySelector('.category-item[data-cat="all"]').classList.add("active");
  render();
};

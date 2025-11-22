/* -----------------------------------------------------
   SLNS DIGITAL CATALOGUE — V7 (Stable Build)
   FIXES:
   ✔ No auto-open modal
   ✔ Modal close works
   ✔ Category bar visible always
   ✔ Filters toggle correctly
   ✔ Lazy loading stable
----------------------------------------------------- */

const metals = ["gold"];
const types = [
  "ALL", "bangles", "bracelet", "chain", "chandraharalu",
  "earring", "kada", "locket", "necklace", "npchains", "ring"
];

const maxImages = 100;
const imagesPath = "images";
const weightFile = "weights.json";
const perPage = 12;
const SLIDER_MAX = 250;

/* DOM */
const gallery = document.getElementById("gallery");
const searchBox = document.getElementById("searchBox");
const weightFrom = document.getElementById("weightFrom");
const weightTo = document.getElementById("weightTo");
const rangeMin = document.getElementById("rangeMin");
const rangeMax = document.getElementById("rangeMax");
const categoryTabs = document.getElementById("categoryTabs");
const pagination = document.getElementById("pagination");
const noImages = document.getElementById("noImages");

const filterPanel = document.getElementById("filterPanel");
const menuToggle = document.getElementById("menuToggle");

const cartDrawer = document.getElementById("cartDrawer");
const cartToggle = document.getElementById("cartToggle");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");

const modal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalClose = document.getElementById("modalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const modalInfo = document.getElementById("modalInfo");
const orderBtn = document.getElementById("orderBtn");

const yearEl = document.getElementById("year");

let weights = {};
let allItems = [];
let filteredItems = [];
let currentPage = 1;
let currentTab = "ALL";
let currentIndex = -1;

/* BUILD MASTER ITEM LIST */
(function () {
  for (let m of metals) {
    for (let t of types) {
      if (t === "ALL") continue;

      for (let i = 1; i <= maxImages; i++) {
        const id = `${m}_${t}${i}`;
        allItems.push({
          id,
          name: `${t} ${i}`,
          src: `${imagesPath}/${id}.jpg`,
          type: t
        });
      }
    }
  }
})();

/* LOAD WEIGHTS */
fetch(weightFile)
  .then(res => res.json())
  .then(data => weights = data)
  .finally(() => initUI());


/* ----------------------
      INIT UI
---------------------- */
function initUI() {
  yearEl.textContent = new Date().getFullYear();

  /* Build category tabs */
  categoryTabs.innerHTML = "";
  types.forEach(t => {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = t.toUpperCase();
    if (t === "ALL") tab.classList.add("active");

    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      tab.classList.add("active");
      currentTab = t;
      currentPage = 1;
      filterItems();
    };

    categoryTabs.appendChild(tab);
  });

  /* Search */
  searchBox.addEventListener("input", debounce(() => {
    currentPage = 1;
    filterItems();
  }, 150));

  /* Weight sliders */
  rangeMin.oninput = () => {
    if (+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value;
    weightFrom.value = rangeMin.value;
  };
  rangeMax.oninput = () => {
    if (+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value;
    weightTo.value = rangeMax.value;
  };
  weightFrom.oninput = () => rangeMin.value = weightFrom.value;
  weightTo.oninput = () => rangeMax.value = weightTo.value;

  document.getElementById("applyFilters").onclick = () => {
    currentPage = 1;
    filterItems();
  };

  document.getElementById("clearFilters").onclick = () => {
    searchBox.value = "";
    weightFrom.value = "";
    weightTo.value = "";
    rangeMin.value = 0;
    rangeMax.value = SLIDER_MAX;
    currentPage = 1;
    filterItems();
  };

  /* Filter panel toggle */
  menuToggle.onclick = () => filterPanel.classList.toggle("show");

  /* Cart toggle */
  cartToggle.onclick = () => cartDrawer.classList.toggle("show");

  /* Modal buttons */
  modalClose.onclick = closeModal;
  modalPrev.onclick = () => showModal(-1);
  modalNext.onclick = () => showModal(1);

  document.addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showModal(-1);
    if (e.key === "ArrowRight") showModal(1);
  });

  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  filterItems();
}


/* ----------------------
      FILTERING
---------------------- */
function filterItems() {
  const q = searchBox.value.toLowerCase();
  let list = [...allItems];

  if (currentTab !== "ALL") list = list.filter(i => i.type === currentTab);

  if (q) list = list.filter(i => i.id.toLowerCase().includes(q));

  const wFrom = parseFloat(weightFrom.value);
  const wTo = parseFloat(weightTo.value);

  if (weightFrom.value || weightTo.value) {
    list = list.filter(i => {
      const w = weights[i.id.toLowerCase()];
      return w && w >= (wFrom || 0) && w <= (wTo || SLIDER_MAX);
    });
  }

  filteredItems = list;
  renderGallery();
}


/* ----------------------
      GALLERY
---------------------- */
function renderGallery() {
  gallery.innerHTML = "";

  if (filteredItems.length === 0) {
    noImages.hidden = false;
    pagination.innerHTML = "";
    return;
  }

  noImages.hidden = true;

  const pages = Math.ceil(filteredItems.length / perPage);
  if (currentPage > pages) currentPage = pages;

  const start = (currentPage - 1) * perPage;
  const items = filteredItems.slice(start, start + perPage);

  items.forEach((it, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const wrap = document.createElement("div");
    wrap.className = "imgwrap";

    const img = document.createElement("img");
    img.dataset.src = it.src;

    img.onload = () => img.classList.add("loaded");
    observeLazy(img);

    wrap.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = it.name;

    const wDiv = document.createElement("div");
    wDiv.className = "weight";
    const w = weights[it.id.toLowerCase()];
    wDiv.textContent = w ? `${w} g` : "";

    card.append(wrap, meta, wDiv);

    card.onclick = () => openModal(start + idx);

    gallery.appendChild(card);
  });

  renderPagination(pages);
}

/* ----------------------
      PAGINATION
---------------------- */
function renderPagination(pages) {
  pagination.innerHTML = "";
  if (pages < 2) return;

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = "btn page";
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("primary");

    btn.onclick = () => {
      currentPage = i;
      renderGallery();
    };

    pagination.appendChild(btn);
  }
}

/* ----------------------
      LAZY LOADING
---------------------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});
function observeLazy(img) { observer.observe(img); }


/* ----------------------
      MODAL
---------------------- */
function openModal(i) {
  currentIndex = i;
  updateModal();
  modal.hidden = false;  // FIXED
}
function closeModal() {
  modal.hidden = true;
}
function showModal(step) {
  currentIndex = (currentIndex + step + filteredItems.length) % filteredItems.length;
  updateModal();
}
function updateModal() {
  const it = filteredItems[currentIndex];
  modalImg.src = it.src;
  const w = weights[it.id.toLowerCase()];
  modalInfo.textContent = w ? `${it.name} — ${w} g` : it.name;
  orderBtn.href = `https://wa.me/917780220369?text=${encodeURIComponent(it.name)}`;
}


/* ----------------------
      UTIL
---------------------- */
function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

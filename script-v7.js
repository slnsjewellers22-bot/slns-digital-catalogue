/* ----------------------------------------------------
   SLNS DIGITAL CATALOGUE — V7  (Category Bar Fixed)
   Includes:
   ✔ Category Bar (ALL / RING / NECKLACE …)
   ✔ Weight filter
   ✔ Search filter
   ✔ Modal preview
   ✔ Pagination
   ✔ No auto-open modal
---------------------------------------------------- */

/* CONFIG */
const metals = ["gold"];
const types = [
  "bangles", "bracelet", "chain", "chandraharalu",
  "earring", "kada", "locket", "necklace", "npchains", "ring"
];

const maxImages = 100;
const imagesPath = "images";
const weightsFile = "weights.json";
const SLIDER_MAX = 250;
const itemsPerPage = 12;

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
const yearEl = document.getElementById("year");

const categoryBar = document.getElementById("categoryBar");

/* MODAL */
const modal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalClose = document.getElementById("modalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const orderBtn = document.getElementById("orderBtn");

/* STATE */
let allItems = [];
let viewList = [];
let validViewList = [];
let weights = {};
let currentIndex = -1;
let currentPage = 1;
let selectedCategory = "all";  // <-- FIXED


/* ----------------------------------------------------
   BUILD ITEM MASTER LIST
---------------------------------------------------- */
(function () {
  for (const m of metals) {
    for (const t of types) {
      for (let i = 1; i <= maxImages; i++) {
        const id = `${m}_${t}${i}`;
        allItems.push({
          id,
          src: `${imagesPath}/${id}.jpg`,
          name: `${capitalize(m)} ${capitalize(t)} ${i}`,
          metal: m,
          type: t,
        });
      }
    }
  }
})();

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


/* ----------------------------------------------------
   LOAD WEIGHTS
---------------------------------------------------- */
fetch(weightsFile)
  .then((r) => r.json())
  .then((data) => {
    Object.keys(data).forEach((k) => {
      weights[k.toLowerCase()] = data[k];
    });
  })
  .catch(() => {})
  .finally(() => {
    initUI();
    render();
  });


/* ----------------------------------------------------
   CATEGORY BAR (Circular Icons)
---------------------------------------------------- */
function buildCategoryBar() {
  const bar = categoryBar;
  bar.innerHTML = "";

  const catOrder = ["all", ...types];

  catOrder.forEach((cat) => {
    const div = document.createElement("div");
    div.className = "category-item";
    div.dataset.cat = cat;

    const label = capitalize(cat);

    div.innerHTML = `
      <div class="cat-img-wrap">
        <img src="images/cat/${cat}.jpg" onerror="this.src='images/cat/all.jpg'">
      </div>
      <div class="cat-label">${label}</div>
    `;

    /* CLICK EVENT — FILTER BY CATEGORY */
    div.addEventListener("click", () => {
      document.querySelectorAll(".category-item").forEach(x => x.classList.remove("active"));
      div.classList.add("active");

      selectedCategory = cat;
      currentPage = 1;
      render();
    });

    bar.appendChild(div);
  });

  // Default active = ALL
  bar.querySelector('.category-item[data-cat="all"]').classList.add("active");
}


/* ----------------------------------------------------
   INIT UI
---------------------------------------------------- */
function initUI() {
  yearEl.textContent = new Date().getFullYear();

  buildCategoryBar();   // <--- IMPORTANT

  /* Weight sliders */
  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;

  rangeMin.addEventListener("input", () => {
    if (+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value;
    weightFromInput.value = rangeMin.value;
  });

  rangeMax.addEventListener("input", () => {
    if (+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value;
    weightToInput.value = rangeMax.value;
  });

  weightFromInput.addEventListener("input", () => {
    rangeMin.value = clamp(weightFromInput.value || 0, 0, SLIDER_MAX);
  });

  weightToInput.addEventListener("input", () => {
    rangeMax.value = clamp(weightToInput.value || 0, 0, SLIDER_MAX);
  });

  /* Search */
  searchBox.addEventListener(
    "input",
    debounce(() => {
      currentPage = 1;
      render();
    }, 200)
  );

  clearFiltersBtn.addEventListener("click", resetFilters);
  applyFiltersBtn.addEventListener("click", () => {
    currentPage = 1;
    render();
  });

  /* Modal */
  modalClose.onclick = closeModal;
  modalPrev.onclick = () => showModal(-1);
  modalNext.onclick = () => showModal(1);

  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showModal(-1);
    if (e.key === "ArrowRight") showModal(1);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}


/* ----------------------------------------------------
   RESET FILTERS
---------------------------------------------------- */
function resetFilters() {
  searchBox.value = "";
  weightFromInput.value = "";
  weightToInput.value = "";

  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;

  selectedCategory = "all";
  document.querySelectorAll(".category-item").forEach(x => x.classList.remove("active"));
  document.querySelector('.category-item[data-cat="all"]').classList.add("active");

  currentPage = 1;
  render();
}


/* ----------------------------------------------------
   MAIN RENDER
---------------------------------------------------- */
function render() {
  const q = searchBox.value.toLowerCase();

  const minW = parseFloat(weightFromInput.value);
  const maxW = parseFloat(weightToInput.value);
  const weightActive = !!weightFromInput.value || !!weightToInput.value;

  viewList = allItems.filter((it) => {

    /* CATEGORY FILTER */
    if (selectedCategory !== "all" && it.type !== selectedCategory) return false;

    /* SEARCH FILTER */
    if (q && !it.id.toLowerCase().includes(q)) return false;

    /* WEIGHT FILTER */
    const w = weights[it.id.toLowerCase()];
    if (weightActive) {
      if (w === undefined) return false;
      if (!(w >= (minW || 0) && w <= (maxW || SLIDER_MAX))) return false;
    }

    return true;
  });

  checkImagesExist();
}


/* ----------------------------------------------------
   CHECK REAL IMAGE EXISTENCE
---------------------------------------------------- */
function checkImagesExist() {
  validViewList = [];
  let pending = viewList.length;

  if (pending === 0) {
    updateGallery();
    return;
  }

  viewList.forEach((item) => {
    const img = new Image();
    img.src = item.src;

    img.onload = () => {
      validViewList.push(item);
      if (--pending === 0) updateGallery();
    };

    img.onerror = () => {
      if (--pending === 0) updateGallery();
    };
  });
}


/* ----------------------------------------------------
   UPDATE GALLERY
---------------------------------------------------- */
function updateGallery() {
  gallery.innerHTML = "";

  if (validViewList.length === 0) {
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

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.classList.add("card");

    const img = document.createElement("img");
    img.src = item.src;

    const name = document.createElement("div");
    name.classList.add("name");
    name.textContent = item.name;

    const w = weights[item.id.toLowerCase()];
    const wDiv = document.createElement("div");
    wDiv.classList.add("weight");
    wDiv.textContent = w ? `${w} g` : "";

    card.append(img, name, wDiv);

    card.addEventListener("click", () => {
      openModal(start + idx);
    });

    gallery.appendChild(card);
  });

  renderPagination(totalPages);
}


/* ----------------------------------------------------
   PAGINATION
---------------------------------------------------- */
function renderPagination(totalPages) {
  paginationEl.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "Prev";
  prev.disabled = currentPage === 1;
  prev.onclick = () => {
    currentPage--;
    updateGallery();
  };
  paginationEl.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = (i === currentPage ? "active" : "");
    btn.onclick = () => {
      currentPage = i;
      updateGallery();
    };
    paginationEl.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = currentPage === totalPages;
  next.onclick = () => {
    currentPage++;
    updateGallery();
  };
  paginationEl.appendChild(next);
}


/* ----------------------------------------------------
   MODAL FUNCTIONS
---------------------------------------------------- */
function openModal(index) {
  currentIndex = index;
  updateModal();
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

function showModal(step) {
  currentIndex =
    (currentIndex + step + validViewList.length) % validViewList.length;
  updateModal();
}

function updateModal() {
  const it = validViewList[currentIndex];
  if (!it) return;

  modalImg.src = it.src;

  const w = weights[it.id.toLowerCase()];
  modalInfo.textContent = w ? `${it.name} — ${w} g` : it.name;

  orderBtn.onclick = () =>
    window.open(
      `https://wa.me/917780220369?text=${encodeURIComponent(it.name)}`,
      "_blank"
    );
}


/* ----------------------------------------------------
   UTILS
---------------------------------------------------- */
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


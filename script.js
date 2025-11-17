/* -----------------------------------------------------
   SLNS DIGITAL CATALOGUE — V6.4 FINAL STABLE
   ✔ Modal preview working
   ✔ Next / Prev working
   ✔ Admin redirect added
   ✔ No auto-open issues
   ✔ Fully compatible with your existing index.html
----------------------------------------------------- */

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

/* DOM ELEMENTS */
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

/* MODAL — FIXED ID */
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

/* BUILD MASTER ITEM LIST */
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

/* LOAD WEIGHTS */
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

/* INIT UI */
function initUI() {
  yearEl.textContent = new Date().getFullYear();

  /* Build category checkboxes */
  catWrap.innerHTML = "";
  types.forEach((t) => {
    const lbl = document.createElement("label");
    lbl.innerHTML =
      `<input type="checkbox" class="filter-type" value="${t}" checked> ${capitalize(t)}`;
    catWrap.appendChild(lbl);
  });

  /* Category select all */
  catSelectAll.addEventListener("change", () => {
    document.querySelectorAll(".filter-type").forEach((cb) => {
      cb.checked = catSelectAll.checked;
    });
  });

  catWrap.addEventListener("change", () => {
    const allChecked = [...document.querySelectorAll(".filter-type")].every(
      (cb) => cb.checked
    );
    catSelectAll.checked = allChecked;
  });

  /* Search */
  searchBox.addEventListener(
    "input",
    debounce(() => {
      currentPage = 1;
      render();
    }, 150)
  );

  clearFiltersBtn.addEventListener("click", resetFilters);
  applyFiltersBtn.addEventListener("click", () => {
    currentPage = 1;
    render();
  });
  homeBtn.addEventListener("click", resetFilters);

  /* Weight Inputs */
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

  /* Modal Events */
  modalClose.onclick = closeModal;
  modalPrev.onclick = () => showModal(-1);
  modalNext.onclick = () => showModal(1);

  /* ESC Key */
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showModal(-1);
    if (e.key === "ArrowRight") showModal(1);
  });

  /* Click outside modal closes */
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  /* ADMIN REDIRECT — FIXED */
  const adminBtn = document.getElementById("adminBtn");
adminBtn.onclick = () => {
    window.location.href = "/dashboard/index.html";
};
  
}

/* RESET FILTERS */
function resetFilters() {
  document.querySelectorAll(".filter-type").forEach((cb) => (cb.checked = true));
  catSelectAll.checked = true;

  searchBox.value = "";
  weightFromInput.value = "";
  weightToInput.value = "";

  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;

  currentPage = 1;
  render();
}

/* MAIN RENDER */
function render() {
  const q = searchBox.value.toLowerCase();
  const selectedCats = [
    ...document.querySelectorAll(".filter-type:checked"),
  ].map((x) => x.value);

  const minW = parseFloat(weightFromInput.value);
  const maxW = parseFloat(weightToInput.value);
  const weightActive = !!weightFromInput.value || !!weightToInput.value;

  viewList = allItems.filter((it) => {
    if (!selectedCats.includes(it.type)) return false;

    if (q && !it.id.toLowerCase().includes(q)) return false;

    const w = weights[it.id.toLowerCase()];
    if (weightActive) {
      if (w === undefined) return false;
      if (!(w >= (minW || 0) && w <= (maxW || SLIDER_MAX))) return false;
    }

    return true;
  });

  checkImagesExist();
}

/* CHECK IMAGE EXISTENCE */
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

/* UPDATE GALLERY */
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

    const wDiv = document.createElement("div");
    wDiv.classList.add("weight");
    const w = weights[item.id.toLowerCase()];
    wDiv.textContent = w ? `${w} g` : "";

    card.append(img, name, wDiv);

    let globalIndex = start + idx;
    card.onclick = () => openModal(globalIndex);

    gallery.appendChild(card);
  });

  renderPagination(totalPages);
}

/* PAGINATION */
function renderPagination(totalPages) {
  paginationEl.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "Prev";
  prev.className = "page-btn";
  prev.disabled = currentPage === 1;
  prev.onclick = () => {
    currentPage--;
    updateGallery();
  };
  paginationEl.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.onclick = () => {
      currentPage = i;
      updateGallery();
    };
    paginationEl.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next";
  next.className = "page-btn";
  next.disabled = currentPage === totalPages;
  next.onclick = () => {
    currentPage++;
    updateGallery();
  };
  paginationEl.appendChild(next);
}

/* MODAL FUNCTIONS — FIXED */
function openModal(index) {
  currentIndex = index;
  updateModal();
  modal.hidden = false;  // fixed ID
}

function closeModal() {
  modal.hidden = true;   // fixed ID
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

/* HELPERS */
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



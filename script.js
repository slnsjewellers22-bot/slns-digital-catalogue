/* ===========================
   CONFIG
=========================== */
const metals = ["gold"];
const types = [
  "bangles", "bracelet", "chain", "chandraharalu",
  "earring", "kada", "locket", "necklace",
  "npchains", "ring"
];
const maxImages = 200;
const imagesPath = "images";
const weightsFile = "weights.json";
const SLIDER_MAX = 250;

/* ===========================
   DOM
=========================== */
const gallery = document.getElementById("gallery");
const searchBox = document.getElementById("searchBox");
const filterBar = document.querySelector(".filter-bar");
const menuToggle = document.getElementById("menuToggle");

const catSelectAll = document.getElementById("catSelectAll");
const weightFromInput = document.getElementById("weightFrom");
const weightToInput = document.getElementById("weightTo");
const rangeMin = document.getElementById("rangeMin");
const rangeMax = document.getElementById("rangeMax");

const clearFiltersBtn = document.getElementById("clearFilters");

/* Modal Elements */
const modalOverlay = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalClose = document.getElementById("modalClose");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const orderBtn = document.getElementById("orderBtn");

/* ===========================
   STATE
=========================== */
let allItems = [];
let viewList = [];
let validViewList = [];
let weights = {};
let currentIndex = 0;

/* ===========================
   BUILD IMAGE LIST
=========================== */
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
          type: t
        });
      }
    }
  }
})();

function capitalize(x) {
  return x[0].toUpperCase() + x.slice(1);
}

/* ===========================
   LOAD WEIGHTS
=========================== */
fetch(weightsFile)
  .then(r => r.json())
  .then(w => {
    Object.keys(w).forEach(k => weights[k.toLowerCase()] = w[k]);
  })
  .finally(() => {
    initFilters();
    render();
  });

/* ===========================
   INIT FILTERS
=========================== */
function initFilters() {

  // Toggle Filter Panel
  menuToggle.onclick = () => {
    filterBar.classList.toggle("show");
  };

  document.addEventListener("click", (e) => {
    if (!filterBar.contains(e.target) && e.target !== menuToggle) {
      filterBar.classList.remove("show");
    }
  });

  // Search
  searchBox.oninput = debounce(render, 200);

  // Clear
  document.getElementById("clearFilters").onclick = resetFilters;

  // Weight slider
  weightFromInput.oninput = syncInputs;
  weightToInput.oninput = syncInputs;

  rangeMin.oninput = () => {
    if (+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value;
    weightFromInput.value = round3(rangeMin.value);
    render();
  };

  rangeMax.oninput = () => {
    if (+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value;
    weightToInput.value = round3(rangeMax.value);
    render();
  };

  // Modal actions
  modalClose.onclick = closeModal;
  modalPrev.onclick = () => showModal(-1);
  modalNext.onclick = () => showModal(1);

  document.onkeydown = (e) => {
    if (e.key === "Escape") closeModal();
    if (modalOverlay.hidden === false) {
      if (e.key === "ArrowLeft") showModal(-1);
      if (e.key === "ArrowRight") showModal(1);
    }
  };
}

/* ===========================
   RESET FILTERS
=========================== */
function resetFilters() {
  searchBox.value = "";
  weightFromInput.value = "";
  weightToInput.value = "";
  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;
  render();
}

/* ===========================
   SYNC
=========================== */
function syncInputs() {
  if (weightFromInput.value) rangeMin.value = clamp(+weightFromInput.value, 0, SLIDER_MAX);
  if (weightToInput.value) rangeMax.value = clamp(+weightToInput.value, 0, SLIDER_MAX);
  render();
}

/* ===========================
   RENDER
=========================== */
function render() {
  const q = searchBox.value.toLowerCase();
  const minW = parseFloat(weightFromInput.value);
  const maxW = parseFloat(weightToInput.value);
  const weightActive = weightFromInput.value || weightToInput.value;

  viewList = allItems.filter(it => {
    if (q && !(it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)))
      return false;

    const w = weights[it.id.toLowerCase()];
    if (weightActive) {
      if (w === undefined) return false;
      if (!(w >= minW && w <= maxW)) return false;
    }

    return true;
  });

  checkImagesExist();
}

/* ===========================
   SHOW ONLY EXISTING IMAGES
=========================== */
function checkImagesExist() {
  validViewList = [];
  let pending = viewList.length;

  if (pending === 0) {
    updateGallery();
    return;
  }

  viewList.forEach(item => {
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

/* ===========================
   UPDATE GALLERY
=========================== */
function updateGallery() {
  gallery.innerHTML = "";
  const noI = document.getElementById("noImages");

  if (validViewList.length === 0) {
    noI.hidden = false;
    return;
  }

  noI.hidden = true;

  validViewList.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = item.src;

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;

    const w = weights[item.id.toLowerCase()];
    const wDiv = document.createElement("div");
    wDiv.className = "weight";
    wDiv.textContent = w ? `${round3(w)} g` : "";

    card.append(img, name, wDiv);
    card.onclick = () => openModal(idx);

    gallery.append(card);
  });
}

/* ===========================
   MODAL FUNCTIONS
=========================== */
function openModal(i) {
  currentIndex = i;
  updateModal();
  modalOverlay.hidden = false;
}

function updateModal() {
  const it = validViewList[currentIndex];
  const w = weights[it.id.toLowerCase()];

  modalImg.src = it.src;
  modalInfo.textContent = w ? `${it.name} — ${round3(w)} g` : it.name;

  orderBtn.href =
    `https://wa.me/917780220369?text=${encodeURIComponent(
      `I want to order ${it.name}${w ? " — " + round3(w) + " g" : ""}`
    )}`;
}

function showModal(d) {
  currentIndex = (currentIndex + d + validViewList.length) % validViewList.length;
  updateModal();
}

function closeModal() {
  modalOverlay.hidden = true;
}

/* ===========================
   HELPERS
=========================== */
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(v, b));
}

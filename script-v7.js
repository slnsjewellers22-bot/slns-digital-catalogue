/* -----------------------------------------
   SLNS DIGITAL CATALOGUE — V7
   Full script (Final)
------------------------------------------ */

/* CONFIG */
const metals = ["gold"];
const types = [
  "all", "bangles", "bracelet", "chain", "chandraharalu",
  "earring", "kada", "locket", "necklace", "npchains", "ring"
];
const maxImages = 100;
const imagesPath = "images";
const weightsFile = "weights.json";
const itemsPerPage = 12;
const SLIDER_MAX = 250;

/* DOM */
const gallery = document.getElementById("gallery");
const noImages = document.getElementById("noImages");
const paginationEl = document.getElementById("pagination");
const searchBox = document.getElementById("searchBox");

const weightFrom = document.getElementById("weightFrom");
const weightTo = document.getElementById("weightTo");
const rangeMin = document.getElementById("rangeMin");
const rangeMax = document.getElementById("rangeMax");

const applyFiltersBtn = document.getElementById("applyFilters");
const clearFiltersBtn = document.getElementById("clearFilters");
const menuToggle = document.getElementById("menuToggle");
const filterPanel = document.getElementById("filterPanel");
const homeBtn = document.getElementById("homeBtn");
const adminBtn = document.getElementById("adminBtn");

// Tabs
const categoryTabs = document.getElementById("categoryTabs");

// Cart
const cartDrawer = document.getElementById("cartDrawer");
const cartToggle = document.getElementById("cartToggle");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartSummary = document.getElementById("cartSummary");
const sendOrder = document.getElementById("sendOrder");

// Modal
const modal = document.getElementById("overlayModal");
const modalImg = document.getElementById("modalImg");
const modalInfo = document.getElementById("modalInfo");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const modalClose = document.getElementById("modalClose");
const orderBtn = document.getElementById("orderBtn");

// Dark mode
const darkToggle = document.getElementById("darkToggle");

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

/* STATE */
let allItems = [];
let weights = {};
let viewList = [];
let validList = [];
let currentPage = 1;
let currentCategory = "all";
let currentIndex = -1;
let cart = [];

/* -----------------------------------------
   BUILD ALL ITEMS
------------------------------------------ */
(function () {
  for (const m of metals) {
    for (const t of types) {
      if (t === "all") continue;

      for (let i = 1; i <= maxImages; i++) {
        const id = `${m}_${t}${i}`;

        allItems.push({
          id,
          src: `${imagesPath}/${id}.jpg`,
          metal: m,
          type: t,
          name: `${capitalize(t)} ${i}`
        });
      }
    }
  }
})();

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* -----------------------------------------
   LOAD WEIGHTS
------------------------------------------ */
fetch(weightsFile)
  .then(r => r.json())
  .then(data => {
    Object.keys(data).forEach(k => {
      weights[k.toLowerCase()] = data[k];
    });
  })
  .finally(() => {
    initTabs();
    render();
  });

/* -----------------------------------------
   CATEGORY TABS
------------------------------------------ */
function initTabs() {
  categoryTabs.innerHTML = "";

  types.forEach(t => {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = capitalize(t);
    tab.dataset.cat = t;

    if (t === "all") tab.classList.add("active");

    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      tab.classList.add("active");

      currentCategory = t;
      currentPage = 1;
      render();
    };

    categoryTabs.appendChild(tab);
  });
}

/* -----------------------------------------
   FILTER PANEL TOGGLE
------------------------------------------ */
menuToggle.onclick = () => {
  filterPanel.classList.toggle("show");
};

/* -----------------------------------------
   HOME + ADMIN
------------------------------------------ */
homeBtn.onclick = () => location.reload();
adminBtn.onclick = () => location.href = "/dashboard/index.html";

/* -----------------------------------------
   SEARCH + FILTERS
------------------------------------------ */
searchBox.addEventListener("input", debounce(() => {
  currentPage = 1;
  render();
}, 200));

applyFiltersBtn.onclick = () => {
  currentPage = 1;
  filterPanel.classList.remove("show");
  render();
};

clearFiltersBtn.onclick = () => {
  searchBox.value = "";
  weightFrom.value = "";
  weightTo.value = "";
  rangeMin.value = 0;
  rangeMax.value = SLIDER_MAX;

  currentPage = 1;
  render();
};

rangeMin.oninput = () => {
  if (+rangeMin.value > +rangeMax.value) rangeMax.value = rangeMin.value;
  weightFrom.value = rangeMin.value;
};

rangeMax.oninput = () => {
  if (+rangeMax.value < +rangeMin.value) rangeMin.value = rangeMax.value;
  weightTo.value = rangeMax.value;
};

/* -----------------------------------------
   MAIN RENDER
------------------------------------------ */
function render() {
  const q = searchBox.value.toLowerCase();
  const minW = parseFloat(weightFrom.value);
  const maxW = parseFloat(weightTo.value);
  const weightActive = weightFrom.value || weightTo.value;

  // Filter by type
  viewList = allItems.filter(it => {
    if (currentCategory !== "all" && it.type !== currentCategory) return false;

    if (q && !it.id.toLowerCase().includes(q)) return false;

    if (weightActive) {
      const w = weights[it.id.toLowerCase()];
      if (w == null) return false;
      if (!(w >= (minW || 0) && w <= (maxW || SLIDER_MAX))) return false;
    }

    return true;
  });

  checkImagesExist();
}

/* -----------------------------------------
   CHECK IMAGES EXIST
------------------------------------------ */
function checkImagesExist() {
  validList = [];
  let pending = viewList.length;

  if (pending === 0) {
    updateGallery();
    return;
  }

  viewList.forEach(item => {
    const img = new Image();
    img.src = item.src;

    img.onload = () => {
      validList.push(item);
      if (--pending === 0) updateGallery();
    };
    img.onerror = () => {
      if (--pending === 0) updateGallery();
    };
  });
}

/* -----------------------------------------
   GALLERY
------------------------------------------ */
function updateGallery() {
  gallery.innerHTML = "";

  if (validList.length === 0) {
    noImages.hidden = false;
    paginationEl.innerHTML = "";
    return;
  }

  noImages.hidden = true;

  const totalPages = Math.ceil(validList.length / itemsPerPage);
  currentPage = clamp(currentPage, 1, totalPages);

  const start = (currentPage - 1) * itemsPerPage;
  const items = validList.slice(start, start + itemsPerPage);

  items.forEach((it, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const wrap = document.createElement("div");
    wrap.className = "imgwrap";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = it.src;

    img.onload = () => img.classList.add("loaded");

    wrap.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = it.name;

    const w = document.createElement("div");
    w.className = "weight";
    let wt = weights[it.id.toLowerCase()];
    w.textContent = wt ? `${wt} g` : "";

    const btn = document.createElement("button");
    btn.className = "add";
    btn.textContent = "Add to Basket";
    btn.onclick = (e) => {
      e.stopPropagation();
      addToCart(it);
    };

    card.append(wrap, meta, w, btn);

    let globalIndex = start + idx;
    card.onclick = () => openModal(globalIndex);

    gallery.appendChild(card);
  });

  renderPagination(totalPages);
}

/* -----------------------------------------
   PAGINATION
------------------------------------------ */
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

/* -----------------------------------------
   MODAL
------------------------------------------ */
function openModal(i) {
  currentIndex = i;
  updateModal();
  modal.hidden = false;
}

function updateModal() {
  const it = validList[currentIndex];
  if (!it) return;

  modalImg.src = it.src;

  const w = weights[it.id.toLowerCase()];
  modalInfo.textContent = w ? `${it.name} — ${w} g` : it.name;

  orderBtn.href = `https://wa.me/917780220369?text=I want ${encodeURIComponent(it.name)}`;
}

modalPrev.onclick = () => {
  currentIndex = (currentIndex - 1 + validList.length) % validList.length;
  updateModal();
};

modalNext.onclick = () => {
  currentIndex = (currentIndex + 1) % validList.length;
  updateModal();
};

modalClose.onclick = () => modal.hidden = true;
modal.onclick = (e) => { if (e.target === modal) modal.hidden = true; };

/* -----------------------------------------
   CART SYSTEM
------------------------------------------ */
function addToCart(item) {
  cart.push(item);
  updateCart();
}

cartToggle.onclick = () => {
  cartDrawer.classList.toggle("show");
};

function updateCart() {
  cartItems.innerHTML = "";
  cartCount.textContent = cart.length;
  cartSummary.textContent = `${cart.length} items`;

  cart.forEach((it, index) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.textContent = `${it.name}`;

    const del = document.createElement("button");
    del.textContent = "✕";
    del.style.marginLeft = "10px";
    del.onclick = () => {
      cart.splice(index, 1);
      updateCart();
    };

    row.appendChild(del);
    cartItems.appendChild(row);
  });
}

sendOrder.onclick = () => {
  if (cart.length === 0) return alert("Cart is empty!");

  let list = cart.map(it => it.name).join(", ");
  window.open(`https://wa.me/917780220369?text=Order: ${encodeURIComponent(list)}`);
};

/* -----------------------------------------
   DARK MODE
------------------------------------------ */
darkToggle.onclick = () => {
  document.body.classList.toggle("dark");
};

/* -----------------------------------------
   HELPERS
------------------------------------------ */
function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

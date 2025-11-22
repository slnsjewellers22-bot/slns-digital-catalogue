/* script-v7.js (DOM ready version) */
document.addEventListener("DOMContentLoaded", () => {
  const metals = ["gold"];
  const types = ["all","bangles","bracelet","chain","chandraharalu","earring","kada","locket","necklace","npchains","ring"];
  const maxImages = 100;
  const imagesPath = "images";
  const weightsFile = "weights.json";
  const itemsPerPage = 12;
  const SLIDER_MAX = 250;

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

  const categoryTabs = document.getElementById("categoryTabs");

  const cartDrawer = document.getElementById("cartDrawer");
  const cartToggle = document.getElementById("cartToggle");
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");
  const cartSummary = document.getElementById("cartSummary");
  const sendOrder = document.getElementById("sendOrder");

  const modal = document.getElementById("overlayModal");
  const modalImg = document.getElementById("modalImg");
  const modalInfo = document.getElementById("modalInfo");
  const modalPrev = document.getElementById("modalPrev");
  const modalNext = document.getElementById("modalNext");
  const modalClose = document.getElementById("modalClose");
  const orderBtn = document.getElementById("orderBtn");

  const darkToggle = document.getElementById("darkToggle");

  let allItems = [];
  let weights = {};
  let viewList = [];
  let validList = [];
  let currentPage = 1;
  let currentCategory = "all";
  let currentIndex = -1;
  let cart = [];

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function debounce(fn, ms=150) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // Build list
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
          name: `${cap(t)} ${i}`
        });
      }
    }
  }

  // Weight loading
  fetch(weightsFile)
    .then(r => r.json())
    .then(data => {
      Object.keys(data).forEach(k => {
        weights[k.toLowerCase()] = data[k];
      });
    })
    .catch(() => {})
    .finally(() => {
      initTabs();
      render();
    });

  function initTabs() {
    categoryTabs.innerHTML = "";
    types.forEach(t => {
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.textContent = cap(t);
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

  menuToggle.onclick = () => {
    filterPanel.classList.toggle("show");
  };

  homeBtn.onclick = () => {
    searchBox.value = "";
    weightFrom.value = "";
    weightTo.value = "";
    rangeMin.value = 0;
    rangeMax.value = SLIDER_MAX;
    currentCategory = "all";
    currentPage = 1;
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    const allTab = document.querySelector('.tab[data-cat="all"]');
    if (allTab) allTab.classList.add("active");
    render();
  };

  adminBtn.onclick = () => {
    window.location.href = "/dashboard/index.html";
  };

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

  darkToggle.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("slns-dark", document.body.classList.contains("dark"));
  };
  if (localStorage.getItem("slns-dark")) {
    document.body.classList.add("dark");
  }

  cartToggle.onclick = () => {
    cartDrawer.classList.toggle("show");
  };
  sendOrder.onclick = () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    let text = cart.map(i => i.name).join(", ");
    window.open(`https://wa.me/${waNumber}?text=Order: ${encodeURIComponent(text)}`);
  };

  modalClose.onclick = () => {
    modal.hidden = true;
  };
  modalPrev.onclick = () => {
    currentIndex = (currentIndex - 1 + validList.length) % validList.length;
    updateModal();
  };
  modalNext.onclick = () => {
    currentIndex = (currentIndex + 1) % validList.length;
    updateModal();
  };
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.hidden = true;
  });
  document.addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") modal.hidden = true;
    if (e.key === "ArrowLeft") modalPrev.click();
    if (e.key === "ArrowRight") modalNext.click();
  });

  function render() {
    const q = (searchBox.value || "").toLowerCase();
    const minW = parseFloat(weightFrom.value);
    const maxW = parseFloat(weightTo.value);
    const weightActive = weightFrom.value || weightTo.value;

    viewList = allItems.filter(it => {
      if (currentCategory !== "all" && it.type !== currentCategory) return false;
      if (q && !it.id.toLowerCase().includes(q) && !it.name.toLowerCase().includes(q)) return false;
      if (weightActive) {
        const w = weights[it.id.toLowerCase()];
        if (w == null) return false;
        if (!(w >= (isNaN(minW) ? -Infinity : minW) && w <= (isNaN(maxW) ? Infinity : maxW))) {
          return false;
        }
      }
      return true;
    });

    checkImages();
  }

  function checkImages() {
    validList = [];
    let pend = viewList.length;
    if (pend === 0) {
      updateGallery();
      return;
    }
    viewList.forEach(it => {
      const img = new Image();
      img.src = it.src;
      img.onload = () => {
        validList.push(it);
        if (--pend === 0) updateGallery();
      };
      img.onerror = () => {
        if (--pend === 0) updateGallery();
      };
    });
  }

  function updateGallery() {
    gallery.innerHTML = "";
    if (validList.length === 0) {
      if (noImages) noImages.hidden = false;
      paginationEl.innerHTML = "";
      return;
    }
    if (noImages) noImages.hidden = true;

    const total = validList.length;
    const totalPages = Math.ceil(total / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const page = validList.slice(start, start + itemsPerPage);

    page.forEach((it, idx) => {
      const card = document.createElement("div");
      card.className = "card";

      const wrap = document.createElement("div");
      wrap.className = "imgwrap";
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = it.src;
      img.onload = () => img.classList.add("loaded");
      wrap.appendChild(img);

      const name = document.createElement("div");
      name.textContent = it.name;

      const w = document.createElement("div");
      w.className = "weight";
      const wt = weights[it.id.toLowerCase()];
      w.textContent = wt != null ? `${wt} g` : "";

      const btn = document.createElement("button");
      btn.className = "add";
      btn.textContent = "Add to Basket";
      btn.onclick = e => {
        e.stopPropagation();
        cart.push(it);
        updateCart();
      };

      card.append(wrap, name, w, btn);
      card.onclick = () => openModal(start + idx);
      gallery.appendChild(card);
    });

    renderPagination(totalPages);
  }

  function renderPagination(tp) {
    paginationEl.innerHTML = "";
    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; updateGallery(); };
    paginationEl.appendChild(prev);

    for (let p = 1; p <= tp; p++) {
      const btn = document.createElement("button");
      btn.textContent = p;
      if (p === currentPage) btn.classList.add("active");
      btn.onclick = () => { currentPage = p; updateGallery(); };
      paginationEl.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = currentPage === tp;
    next.onclick = () => { currentPage++; updateGallery(); };
    paginationEl.appendChild(next);
  }

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
    modalInfo.textContent = w != null ? `${it.name} — ${round3(w)} g` : it.name;
    orderBtn.href = `https://wa.me/${waNumber}?text=I want ${encodeURIComponent(it.name)}`;
  }

  function round3(v) {
    return Math.round(v * 1000) / 1000;
  }

  updateCart();
  render();
});

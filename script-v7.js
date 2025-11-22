/* -----------------------------------------------------
   SLNS DIGITAL CATALOGUE — V7 (FINAL FIXED VERSION)
   ✔ Category Bar always visible
   ✔ Modal does NOT auto-open
   ✔ Close button works
   ✔ Overlay click works
   ✔ ESC works
   ✔ Fast filters + lazy loading
   ✔ Basket + Dark mode
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

  /* ----------------------
      CONFIG
  ---------------------- */
  const metals = ["gold"];
  const types = [
    "all",
    "bangles","bracelet","chain","chandraharalu",
    "earring","kada","locket","necklace","npchains","ring"
  ];
  const maxImages = 100;
  const imagesPath = "images";
  const weightsFile = "weights.json";
  const itemsPerPage = 12;
  const SLIDER_MAX = 250;
  const waNumber = "917780220369";

  /* ----------------------
      DOM ELEMENTS
  ---------------------- */
  const gallery = document.getElementById("gallery");
  const noImages = document.getElementById("noImages");
  const paginationEl = document.getElementById("pagination");

  const searchBox = document.getElementById("searchBox");
  const filterPanel = document.getElementById("filterPanel");
  const menuToggle = document.getElementById("menuToggle");
  const applyFiltersBtn = document.getElementById("applyFilters");
  const clearFiltersBtn = document.getElementById("clearFilters");

  const categoryTabs = document.getElementById("categoryTabs");

  const weightFrom = document.getElementById("weightFrom");
  const weightTo = document.getElementById("weightTo");
  const rangeMin = document.getElementById("rangeMin");
  const rangeMax = document.getElementById("rangeMax");

  const homeBtn = document.getElementById("homeBtn");
  const adminBtn = document.getElementById("adminBtn");

  /* Cart Elements */
  const cartDrawer = document.getElementById("cartDrawer");
  const cartToggle = document.getElementById("cartToggle");
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");
  const cartSummary = document.getElementById("cartSummary");
  const sendOrder = document.getElementById("sendOrder");

  /* Modal */
  const modal = document.getElementById("overlayModal");
  const modalImg = document.getElementById("modalImg");
  const modalInfo = document.getElementById("modalInfo");
  const modalPrev = document.getElementById("modalPrev");
  const modalNext = document.getElementById("modalNext");
  const modalClose = document.getElementById("modalClose");
  const orderBtn = document.getElementById("orderBtn");

  const darkToggle = document.getElementById("darkToggle");

  /* ----------------------
      STATE
  ---------------------- */
  let allItems = [];
  let weights = {};
  let viewList = [];
  let validList = [];
  let currentPage = 1;
  let currentCategory = "all";
  let currentIndex = -1;
  let cart = [];

  /* ----------------------
      HELPERS
  ---------------------- */
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function debounce(fn,ms=150){
    let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); };
  }
  function round3(v){ return Math.round(v*1000)/1000; }

  /* ----------------------
      BUILD MASTER ITEM LIST
  ---------------------- */
  for(const m of metals){
    for(const t of types){
      if(t==="all") continue;
      for(let i=1;i<=maxImages;i++){
        const id=`${m}_${t}${i}`;
        allItems.push({
          id,
          src:`${imagesPath}/${id}.jpg`,
          metal:m,
          type:t,
          name:`${cap(t)} ${i}`
        });
      }
    }
  }

  /* ----------------------
      LOAD WEIGHTS
  ---------------------- */
  fetch(weightsFile)
    .then(r=>r.json())
    .then(data=>{
      Object.keys(data).forEach(k=>weights[k.toLowerCase()]=data[k]);
    })
    .catch(()=>{})
    .finally(()=>{
      initTabs();
      render();
    });

  /* ----------------------
      INIT CATEGORY TABS
  ---------------------- */
  function initTabs(){
    categoryTabs.innerHTML="";

    types.forEach(t=>{
      const tab=document.createElement("button");
      tab.className="tab";
      tab.textContent=cap(t);
      tab.dataset.cat=t;

      if(t==="all") tab.classList.add("active");

      tab.onclick=()=>{
        document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
        tab.classList.add("active");

        currentCategory=t;
        currentPage=1;
        render();
      };

      categoryTabs.appendChild(tab);
    });
  }

  /* ----------------------
      FILTER PANEL CONTROLS
  ---------------------- */
  menuToggle.onclick=()=>filterPanel.classList.toggle("show");

  applyFiltersBtn.onclick=()=>{
    currentPage=1;
    filterPanel.classList.remove("show");
    render();
  };

  clearFiltersBtn.onclick=()=>{
    searchBox.value="";
    weightFrom.value="";
    weightTo.value="";
    rangeMin.value=0;
    rangeMax.value=SLIDER_MAX;
    currentPage=1;
    render();
  };

  homeBtn.onclick=()=>{
    searchBox.value="";
    weightFrom.value="";
    weightTo.value="";
    rangeMin.value=0;
    rangeMax.value=SLIDER_MAX;

    currentCategory="all";
    currentPage=1;

    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelector('.tab[data-cat="all"]').classList.add("active");

    render();
  };

  adminBtn.onclick=()=>location.href="/dashboard/index.html";

  /* Search */
  searchBox.addEventListener("input",debounce(()=>{ currentPage=1; render(); },200));

  /* Weight sync */
  rangeMin.oninput=()=>{
    if(+rangeMin.value > +rangeMax.value) rangeMax.value=rangeMin.value;
    weightFrom.value=rangeMin.value;
  };
  rangeMax.oninput=()=>{
    if(+rangeMax.value < +rangeMin.value) rangeMin.value=rangeMax.value;
    weightTo.value=rangeMax.value;
  };
  weightFrom.oninput=()=>rangeMin.value=clamp(weightFrom.value||0,0,SLIDER_MAX);
  weightTo.oninput=()=>rangeMax.value=clamp(weightTo.value||0,0,SLIDER_MAX);

  /* ----------------------
      DARK MODE
  ---------------------- */
  darkToggle.onclick=()=>{
    document.body.classList.toggle("dark");
    localStorage.setItem("slns-dark",document.body.classList.contains("dark"));
  };
  if(localStorage.getItem("slns-dark")) document.body.classList.add("dark");

  /* ----------------------
      CART
  ---------------------- */
  cartToggle.onclick=()=>cartDrawer.classList.toggle("show");

  function updateCart(){
    cartCount.textContent=cart.length;
    cartItems.innerHTML="";

    cart.forEach((item,i)=>{
      const div=document.createElement("div");
      div.className="cart-item";
      div.innerHTML=`
        <span>${item.name}</span>
        <button class="remove">✕</button>
      `;
      div.querySelector(".remove").onclick=()=>{
        cart.splice(i,1);
        updateCart();
      };
      cartItems.appendChild(div);
    });

    cartSummary.textContent=cart.length+" items";
  }

  sendOrder.onclick=()=>{
    if(cart.length===0){ alert("Cart empty"); return; }
    let msg=cart.map(i=>i.name).join(", ");
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`);
  };

  /* ----------------------
      MAIN FILTER + RENDER
  ---------------------- */
  function render(){
    const q=(searchBox.value||"").toLowerCase();
    const minW=parseFloat(weightFrom.value);
    const maxW=parseFloat(weightTo.value);
    const weightActive=weightFrom.value||weightTo.value;

    viewList = allItems.filter(it=>{
      if(currentCategory!=="all" && it.type!==currentCategory) return false;

      if(q && !it.id.toLowerCase().includes(q) && !it.name.toLowerCase().includes(q))
        return false;

      if(weightActive){
        const w=weights[it.id.toLowerCase()];
        if(w==null) return false;
        if(!(w >= (isNaN(minW)?-Infinity:minW) &&
             w <= (isNaN(maxW)?Infinity:maxW)))
          return false;
      }
      return true;
    });

    checkImages();
  }

  /* ----------------------
      CHECK IMAGE EXIST
  ---------------------- */
  function checkImages(){
    validList=[];
    let pending=viewList.length;

    if(pending===0){ updateGallery(); return; }

    viewList.forEach(it=>{
      const img=new Image();
      img.src=it.src;
      img.onload=()=>{ validList.push(it); if(--pending===0) updateGallery(); };
      img.onerror=()=>{ if(--pending===0) updateGallery(); };
    });
  }

  /* ----------------------
      GALLERY
  ---------------------- */
  function updateGallery(){
    gallery.innerHTML="";

    if(validList.length===0){
      noImages.hidden=false;
      paginationEl.innerHTML="";
      return;
    }
    noImages.hidden=true;

    const total=validList.length;
    const totalPages=Math.ceil(total/itemsPerPage);
    currentPage=clamp(currentPage,1,totalPages);

    const start=(currentPage-1)*itemsPerPage;
    const items=validList.slice(start,start+itemsPerPage);

    items.forEach((it,idx)=>{
      const card=document.createElement("div");
      card.className="card";

      const wrap=document.createElement("div");
      wrap.className="imgwrap";

      const img=document.createElement("img");
      img.loading="lazy";
      img.src=it.src;
      img.onload=()=>img.classList.add("loaded");

      wrap.appendChild(img);

      const name=document.createElement("div");
      name.textContent=it.name;

      const w=document.createElement("div");
      w.className="weight";
      const wt=weights[it.id.toLowerCase()];
      w.textContent=wt!=null?`${wt} g`:"";

      const btn=document.createElement("button");
      btn.className="add";
      btn.textContent="Add to Basket";
      btn.onclick=e=>{
        e.stopPropagation();
        cart.push(it);
        updateCart();
      };

      card.append(wrap,name,w,btn);

      /* Proper modal open */
      card.onclick=()=>openModal(start+idx);

      gallery.appendChild(card);
    });

    renderPagination(totalPages);
  }

  /* ----------------------
      PAGINATION
  ---------------------- */
  function renderPagination(tp){
    paginationEl.innerHTML="";

    const prev=document.createElement("button");
    prev.textContent="Prev";
    prev.disabled=currentPage===1;
    prev.onclick=()=>{ currentPage--; updateGallery(); };
    paginationEl.appendChild(prev);

    for(let p=1;p<=tp;p++){
      const btn=document.createElement("button");
      btn.textContent=p;
      if(p===currentPage) btn.classList.add("active");
      btn.onclick=()=>{ currentPage=p; updateGallery(); };
      paginationEl.appendChild(btn);
    }

    const next=document.createElement("button");
    next.textContent="Next";
    next.disabled=currentPage===tp;
    next.onclick=()=>{ currentPage++; updateGallery(); };
    paginationEl.appendChild(next);
  }

  /* ----------------------
      MODAL — FIXED
  ---------------------- */
  function openModal(i){
    currentIndex=i;
    updateModal();
    modal.classList.add("open");
    modal.hidden=false;
  }

  function closeModal(){
    modal.classList.remove("open");
    modal.hidden=true;
  }

  modalClose.addEventListener("click",(e)=>{
    e.stopPropagation();
    closeModal();
  });

  modal.addEventListener("click",(e)=>{
    if(e.target===modal) closeModal();
  });

  document.addEventListener("keydown",e=>{
    if(modal.hidden) return;
    if(e.key==="Escape") closeModal();
    if(e.key==="ArrowLeft") showPrev();
    if(e.key==="ArrowRight") showNext();
  });

  function showPrev(){
    currentIndex=(currentIndex-1+validList.length)%validList.length;
    updateModal();
  }
  function showNext(){
    currentIndex=(currentIndex+1)%validList.length;
    updateModal();
  }

  modalPrev.onclick=showPrev;
  modalNext.onclick=showNext;

  function updateModal(){
    const it=validList[currentIndex];
    if(!it) return;

    modalImg.src=it.src;
    const w=weights[it.id.toLowerCase()];
    modalInfo.textContent=w!=null?`${it.name} — ${w} g`:it.name;

    orderBtn.href=`https://wa.me/${waNumber}?text=${encodeURIComponent(it.name)}`;
  }

  /* ----------------------
      INITIAL RENDER
  ---------------------- */
  updateCart();
  render();

}); // END DOMContentLoaded

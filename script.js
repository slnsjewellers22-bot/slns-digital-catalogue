// Loads items.json (committed to repo) and renders gallery.
// items.json structure: array of { id, name, metal, category, weight, imageURL, timestamp }

const gallery = document.getElementById('gallery');
const searchBox = document.getElementById('searchBox');
const noImages = document.getElementById('noImages');
const homeBtn = document.getElementById('homeBtn');

let items = [];

async function loadItems(){
  try{
    const resp = await fetch('/items.json', {cache: "no-store"});
    if(!resp.ok) throw 'no items';
    items = await resp.json();
    // sort newest first by timestamp
    items.sort((a,b)=> (b.timestamp||0) - (a.timestamp||0));
    render();
  }catch(e){
    items = [];
    render();
  }
}

function render(){
  gallery.innerHTML = '';
  const q = (searchBox.value || '').toLowerCase().trim();
  const shown = items.filter(it=>{
    if(!q) return true;
    return (it.id && it.id.toLowerCase().includes(q)) || (it.name && it.name.toLowerCase().includes(q));
  });
  if(shown.length===0){ noImages.hidden=false; return; } else noImages.hidden=true;
  shown.forEach(it=>{
    const card = document.createElement('div'); card.className='card';
    const img = document.createElement('img'); img.src = it.imageURL || `images/${it.id}.jpg`;
    img.onerror = ()=>{ img.style.display='none'; const ph=document.createElement('div'); ph.className='noimg'; ph.textContent='No Image'; card.insertBefore(ph, card.firstChild); };
    const name = document.createElement('div'); name.className='name'; name.textContent = it.name || it.id;
    const meta = document.createElement('div'); meta.style.display='flex'; meta.style.justifyContent='space-between'; 
    const w = document.createElement('div'); w.className='weight'; w.textContent = it.weight ? (it.weight + ' g') : '';
    meta.appendChild(w);
    // New badge for <3 days
    if(it.timestamp){
      const age = Date.now() - it.timestamp;
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if(age < threeDays){
        const b = document.createElement('span'); b.className='badge-new'; b.textContent='NEW';
        meta.appendChild(b);
      }
    }
    card.appendChild(img); card.appendChild(name); card.appendChild(meta);
    gallery.appendChild(card);
  });
}

searchBox.addEventListener('input', ()=>render());
homeBtn.addEventListener('click', ()=>{ searchBox.value=''; loadItems(); });

loadItems();

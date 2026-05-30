const gallery = document.getElementById('gallery');
const filters = document.getElementById('filters');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const spinner = document.getElementById('spinner');
const closeBtn = document.getElementById('close');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const topBtn = document.getElementById('top');

const LABELS = { 'washington-dc': 'Washington DC' };
const ABBREVS = new Set(['sf', 'bw', 'dc', 'nsx', 'bmw', 'v8', 'lc']);

function altFromFilename(name) {
  return name.replace(/\.[^.]+$/, '').split('-')
    .map(w => ABBREVS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

let currentIndex = 0;
let activeCat = 'all';

function visiblePhotos() {
  return Array.from(document.querySelectorAll('.photo:not(.hidden)'));
}

fetch('photos.json')
  .then(r => r.json())
  .then(data => {
    const categories = Object.keys(data).filter(k => !k.startsWith('_') && data[k].length > 0);

    if (!categories.length) {
      gallery.innerHTML = '<p id="empty">No photos yet.</p>';
      return;
    }

    buildFilters(categories);

    const entries = (data._all || []).map(path => {
      const slash = path.indexOf('/');
      return { cat: path.slice(0, slash), name: path.slice(slash + 1) };
    });

    entries.forEach(({ cat, name }) => {
      const img = document.createElement('img');
      img.src = `photos/thumbs/${cat}/${name}`;
      img.className = 'photo';
      img.dataset.cat = cat;
      img.dataset.full = `photos/${cat}/${name}`;
      img.loading = 'lazy';
      img.alt = altFromFilename(name);
      img.addEventListener('load', () => img.classList.add('loaded'));
      if (img.complete) img.classList.add('loaded');
      img.addEventListener('click', () => {
        const photos = visiblePhotos();
        openPhoto(photos.indexOf(img));
      });
      gallery.appendChild(img);
    });

    applyHash();
  })
  .catch(() => {
    gallery.innerHTML = '<p id="empty">No photos yet.</p>';
  });

function buildFilters(categories) {
  filters.appendChild(makeBtn('All', 'all', true));
  categories.forEach(cat => {
    const label = LABELS[cat] ?? cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    filters.appendChild(makeBtn(label, cat, false));
  });
}

function makeBtn(label, cat, active) {
  const btn = document.createElement('button');
  btn.dataset.cat = cat;
  if (active) btn.classList.add('active');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    document.querySelectorAll('#filters button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = cat;
    document.querySelectorAll('.photo').forEach(img => {
      img.classList.toggle('hidden', cat !== 'all' && img.dataset.cat !== cat);
    });
    location.hash = cat === 'all' ? '' : cat;
  });
  return btn;
}

function applyHash() {
  const cat = location.hash.slice(1);
  const btn = cat
    ? document.querySelector(`#filters button[data-cat="${cat}"]`)
    : document.querySelector('#filters button[data-cat="all"]');
  if (btn) btn.click();
}

function preload(index) {
  const photos = visiblePhotos();
  [-1, 1].forEach(offset => {
    const i = (index + offset + photos.length) % photos.length;
    const src = photos[i]?.dataset.full;
    if (src) { const img = new Image(); img.src = src; }
  });
}

function openPhoto(index) {
  const photos = visiblePhotos();
  if (!photos.length) return;
  currentIndex = (index + photos.length) % photos.length;
  const src = photos[currentIndex].dataset.full;

  lightboxImg.classList.remove('ready');
  spinner.classList.add('active');

  lightboxImg.onload = () => {
    spinner.classList.remove('active');
    lightboxImg.classList.add('ready');
  };
  lightboxImg.src = src;
  if (lightboxImg.complete) {
    spinner.classList.remove('active');
    lightboxImg.classList.add('ready');
  }

  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  preload(currentIndex);
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  lightboxImg.classList.remove('ready');
  spinner.classList.remove('active');
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closeLightbox);
prevBtn.addEventListener('click', () => openPhoto(currentIndex - 1));
nextBtn.addEventListener('click', () => openPhoto(currentIndex + 1));

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', e => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') openPhoto(currentIndex - 1);
  if (e.key === 'ArrowRight') openPhoto(currentIndex + 1);
});

let touchStartX = 0;
lightbox.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) openPhoto(currentIndex + (dx < 0 ? 1 : -1));
});

window.addEventListener('hashchange', applyHash);

window.addEventListener('scroll', () => {
  topBtn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

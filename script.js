const gallery = document.getElementById('gallery');
const filters = document.getElementById('filters');
const colorFilters = document.getElementById('color-filters');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const spinner = document.getElementById('spinner');
const exifPanel = document.getElementById('exif-panel');
const closeBtn = document.getElementById('close');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const topBtn = document.getElementById('top');
const mapEl = document.getElementById('map');

const LABELS = { 'washington-dc': 'Washington DC' };
const ABBREVS = new Set(['sf', 'bw', 'dc', 'nsx', 'bmw', 'v8', 'lc']);
const SWATCH_COLORS = { warm: '#e07820', cool: '#2e72c8', mono: '#888888', earth: '#6b8c42' };

function altFromFilename(name) {
  return name.replace(/\.[^.]+$/, '').split('-')
    .map(w => ABBREVS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

let currentIndex = 0;
let activeColor = null;
let activeCat = 'all';
let leafletMap = null;
let meta = {};

function visiblePhotos() {
  return Array.from(document.querySelectorAll('.photo:not(.hidden)'));
}

function applyFilters() {
  document.querySelectorAll('.photo').forEach(img => {
    const catMatch = activeCat === 'all' || img.dataset.cat === activeCat;
    const colorMatch = !activeColor || img.dataset.color === activeColor;
    img.classList.toggle('hidden', !catMatch || !colorMatch);
  });
}

fetch('photos.json')
  .then(r => r.json())
  .then(data => {
    meta = data._meta || {};
    const categories = Object.keys(data).filter(k => !k.startsWith('_') && data[k].length > 0);

    if (!categories.length) {
      gallery.innerHTML = '<p id="empty">No photos yet.</p>';
      return;
    }

    buildFilters(categories);
    buildColorFilters();

    const entries = (data._all || []).map(path => {
      const slash = path.indexOf('/');
      return { cat: path.slice(0, slash), name: path.slice(slash + 1), path };
    });

    entries.forEach(({ cat, name, path }) => {
      const img = document.createElement('img');
      img.src = `photos/thumbs/${cat}/${name}`;
      img.className = 'photo';
      img.dataset.cat = cat;
      img.dataset.full = `photos/${cat}/${name}`;
      img.dataset.path = path;
      img.dataset.color = meta[path]?.color || '';
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
    initMapToggle();
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
    applyFilters();
    location.hash = cat === 'all' ? '' : cat;
  });
  return btn;
}

function buildColorFilters() {
  const buckets = [...new Set(Object.values(meta).map(m => m.color).filter(Boolean))];
  const order = ['warm', 'cool', 'earth', 'mono'];
  order.filter(b => buckets.includes(b)).forEach(bucket => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.dataset.bucket = bucket;
    btn.style.background = SWATCH_COLORS[bucket];
    btn.title = bucket.charAt(0).toUpperCase() + bucket.slice(1);
    btn.setAttribute('aria-label', bucket);
    btn.addEventListener('click', () => {
      if (activeColor === bucket) {
        activeColor = null;
        btn.classList.remove('active');
      } else {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        activeColor = bucket;
        btn.classList.add('active');
      }
      applyFilters();
    });
    colorFilters.appendChild(btn);
  });
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
  const photo = photos[currentIndex];
  const src = photo.dataset.full;

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

  const exif = meta[photo.dataset.path]?.exif;
  if (exif) {
    const parts = [
      exif.camera,
      exif.lens,
      exif.focal,
      exif.aperture,
      exif.shutter,
      exif.iso ? `ISO ${exif.iso}` : null
    ].filter(Boolean);
    exifPanel.textContent = parts.join(' · ');
  } else {
    exifPanel.textContent = '';
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
  exifPanel.textContent = '';
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

function initMapToggle() {
  const hasGPS = Object.values(meta).some(m => m.gps);
  if (!hasGPS) return;

  const btn = document.createElement('button');
  btn.id = 'map-toggle';
  btn.textContent = 'Map';
  filters.appendChild(btn);

  btn.addEventListener('click', () => {
    const mapVisible = !mapEl.hidden;
    if (mapVisible) {
      mapEl.hidden = true;
      gallery.hidden = false;
      btn.classList.remove('active');
      btn.textContent = 'Map';
    } else {
      gallery.hidden = true;
      mapEl.hidden = false;
      btn.classList.add('active');
      btn.textContent = 'Grid';
      if (!leafletMap) initMap();
    }
  });
}

function initMap() {
  leafletMap = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(leafletMap);

  const allPhotos = Array.from(document.querySelectorAll('.photo'));

  Object.entries(meta).forEach(([path, m]) => {
    if (!m.gps) return;
    const [lat, lng] = m.gps;
    const marker = L.circleMarker([lat, lng], {
      radius: 7, fillColor: '#1d1d1f', color: '#fff',
      weight: 2, opacity: 1, fillOpacity: 0.9
    }).addTo(leafletMap);

    marker.on('click', () => {
      const img = allPhotos.find(p => p.dataset.path === path);
      if (img) {
        mapEl.hidden = true;
        gallery.hidden = false;
        document.getElementById('map-toggle').classList.remove('active');
        document.getElementById('map-toggle').textContent = 'Map';
        const photos = visiblePhotos();
        openPhoto(photos.indexOf(img));
      }
    });
  });
}

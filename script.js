const gallery = document.getElementById('gallery');
const filters = document.getElementById('filters');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.getElementById('close');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

const LABELS = { 'washington-dc': 'Washington DC' };

let currentIndex = 0;

function visiblePhotos() {
  return Array.from(document.querySelectorAll('.photo:not(.hidden)'));
}

fetch('photos.json')
  .then(r => r.json())
  .then(data => {
    const categories = Object.keys(data).filter(k => k !== '_all' && data[k].length > 0);

    if (!categories.length) {
      gallery.innerHTML = '<p id="empty">No photos yet.</p>';
      return;
    }

    buildFilters(categories);
    applyHash();

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
      img.alt = '';
      img.addEventListener('load', () => img.classList.add('loaded'));
      if (img.complete) img.classList.add('loaded');
      img.addEventListener('click', () => {
        const photos = visiblePhotos();
        openPhoto(photos.indexOf(img));
      });
      gallery.appendChild(img);
    });
  })
  .catch(() => {
    gallery.innerHTML = '<p id="empty">No photos yet.</p>';
  });

function buildFilters(categories) {
  const all = makeBtn('All', 'all', true);
  filters.appendChild(all);
  categories.forEach(cat => {
    const label = LABELS[cat] ?? cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    filters.appendChild(makeBtn(label, cat, false));
  });
}

function makeBtn(label, cat, active) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.dataset.cat = cat;
  if (active) btn.classList.add('active');
  btn.addEventListener('click', () => {
    document.querySelectorAll('#filters button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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

function openPhoto(index) {
  const photos = visiblePhotos();
  if (!photos.length) return;
  currentIndex = (index + photos.length) % photos.length;
  lightboxImg.src = photos[currentIndex].dataset.full;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
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

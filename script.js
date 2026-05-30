const gallery = document.getElementById('gallery');
const filters = document.getElementById('filters');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.getElementById('close');

fetch('photos.json')
  .then(r => r.json())
  .then(data => {
    const categories = Object.keys(data).filter(k => data[k].length > 0);

    if (!categories.length) {
      gallery.innerHTML = '<p id="empty">No photos yet.</p>';
      return;
    }

    buildFilters(categories);

    const lists = categories.map(cat => data[cat].map(name => ({ cat, name })));
    const maxLen = Math.max(...lists.map(l => l.length));
    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        if (i >= list.length) continue;
        const { cat, name } = list[i];
        const img = document.createElement('img');
        img.src = `photos/thumbs/${cat}/${name}`;
        img.className = 'photo';
        img.dataset.cat = cat;
        img.loading = 'lazy';
        img.alt = '';
        img.addEventListener('click', () => openPhoto(`photos/${cat}/${name}`));
        gallery.appendChild(img);
      }
    }
  })
  .catch(() => {
    gallery.innerHTML = '<p id="empty">No photos yet.</p>';
  });

function buildFilters(categories) {
  const all = makeBtn('All', 'all', true);
  filters.appendChild(all);
  categories.forEach(cat => {
    const label = cat.replace(/-/g, ' ');
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
  });
  return btn;
}

function openPhoto(src) {
  lightboxImg.src = src;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

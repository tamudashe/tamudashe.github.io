const gallery = document.getElementById('gallery');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.getElementById('close');

fetch('photos.json')
  .then(r => r.json())
  .then(photos => {
    if (!photos.length) {
      gallery.innerHTML = '<p id="empty">No photos yet.</p>';
      return;
    }
    photos.forEach(name => {
      const img = document.createElement('img');
      img.src = 'photos/thumbs/' + name;
      img.className = 'photo';
      img.loading = 'lazy';
      img.alt = '';
      img.addEventListener('click', () => openPhoto('photos/' + name));
      gallery.appendChild(img);
    });
  })
  .catch(() => {
    gallery.innerHTML = '<p id="empty">No photos yet.</p>';
  });

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

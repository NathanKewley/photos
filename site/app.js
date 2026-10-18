const app = document.getElementById('app'), crumb = document.getElementById('crumb');
const $ = id => document.getElementById(id);
const lb = $('lb'), lbImg = $('lb-img'), panel = $('lb-panel');
let albums = [], current = null, idx = 0;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function init() {
  try { albums = (await (await fetch('albums.json')).json()).albums; }
  catch { app.innerHTML = '<p class="empty">Could not load albums. Check that the build has run.</p>'; return; }
  addEventListener('hashchange', route);
  route();
}

function route() {
  closeLb();
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const album = albums.find(a => a.id === id);
  scrollTo(0, 0);
  album ? showAlbum(album) : showHome();
}

function showHome() {
  document.title = 'Nath Kewley Photos'; crumb.innerHTML = '';
  if (!albums.length) { app.innerHTML = '<p class="empty">No albums yet. Add a folder of photos inside <code>photos/</code> and push.</p>'; return; }
  app.innerHTML = `<div class="head"><h1>Albums</h1></div><div class="albums">${albums.map(a => `
    <a class="card" href="#/${a.id}" style="background:${a.color}">
      <img src="${a.cover}" alt="" loading="lazy">
      <div class="cap glass"><b>${esc(a.title)}</b><span>${a.photos.length} photo${a.photos.length === 1 ? '' : 's'}</span></div>
    </a>`).join('')}</div>`;
}

function showAlbum(a) {
  current = a; document.title = `${a.title} · Nath Kewley Photos`;
  crumb.innerHTML = `<a href="#/">Albums</a> / ${esc(a.title)}`;
  app.innerHTML = `<div class="head"><h1>${esc(a.title)}</h1>${a.description ? `<p>${esc(a.description)}</p>` : ''}</div>
    <div class="masonry">${a.photos.map((p, i) => `
      <button class="shot" data-i="${i}" style="aspect-ratio:${p.w}/${p.h};background:${p.color}" aria-label="Open photo ${i + 1}">
        <img src="${p.thumb}" width="${p.w}" height="${p.h}" alt="" loading="lazy">
      </button>`).join('')}</div>`;
  app.querySelectorAll('.shot img').forEach(im => im.complete ? im.classList.add('ok') : im.addEventListener('load', () => im.classList.add('ok')));
}

app.addEventListener('click', e => { const s = e.target.closest('.shot'); if (s) openLb(+s.dataset.i); });

function openLb(i) { idx = i; lb.hidden = false; document.body.style.overflow = 'hidden'; show(); $('lb-close').focus(); }
function closeLb() { if (lb.hidden) return; lb.hidden = true; document.body.style.overflow = ''; panel.classList.remove('open'); $('lb-info').setAttribute('aria-pressed', 'false'); }

function show() {
  const ps = current.photos, p = ps[idx];
  lbImg.src = p.large; lbImg.alt = `${current.title}, photo ${idx + 1}`;
  $('lb-count').textContent = `${idx + 1} / ${ps.length}`;
  const rows = [['Camera', p.exif.camera], ['Lens', p.exif.lens], ['Focal length', p.exif.focal], ['Aperture', p.exif.aperture],
    ['Shutter', p.exif.shutter], ['ISO', p.exif.iso && p.exif.iso.replace('ISO ', '')], ['Taken', p.date && new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'medium' })]].filter(r => r[1]);
  panel.innerHTML = rows.length ? `<dl style="display:contents">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '<span>No EXIF data in this photo.</span>';
  [ps[(idx + 1) % ps.length], ps[(idx - 1 + ps.length) % ps.length]].forEach(n => { new Image().src = n.large; });
}
const step = d => { idx = (idx + d + current.photos.length) % current.photos.length; show(); };
const toggleInfo = () => $('lb-info').setAttribute('aria-pressed', panel.classList.toggle('open'));

$('lb-close').onclick = closeLb; $('lb-prev').onclick = () => step(-1); $('lb-next').onclick = () => step(1); $('lb-info').onclick = toggleInfo;
lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) closeLb(); });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLb();
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'i' || e.key === 'I') toggleInfo();
});

let sx = null;
lb.addEventListener('pointerdown', e => { sx = e.clientX; });
lb.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50 && e.target === lbImg) step(e.clientX < sx ? 1 : -1); sx = null; });

init();

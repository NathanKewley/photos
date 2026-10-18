// Scans photos/<album>/*, makes thumbnails + large versions, reads EXIF, writes dist/albums.json
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';

const PHOTOS = 'photos', DIST = 'dist';
const EXT = /\.(jpe?g|png|webp|tiff?)$/i;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const pretty = s => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const hex = ({ r, g, b }) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

async function readJson(p) { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return {}; } }

async function processPhoto(file, albumSlug) {
  const base = slug(path.parse(file).name);
  const dir = path.join(DIST, 'img', albumSlug);
  await fs.mkdir(dir, { recursive: true });
  const img = () => sharp(file).rotate();
  await img().resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(path.join(dir, `${base}-t.jpg`));
  const large = await img().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(path.join(dir, `${base}-l.jpg`));
  const { dominant } = await img().resize(32).stats();
  const x = await exifr.parse(file, ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal']).catch(() => null) || {};
  const t = x.ExposureTime;
  return {
    thumb: `img/${albumSlug}/${base}-t.jpg`,
    large: `img/${albumSlug}/${base}-l.jpg`,
    w: large.width, h: large.height, color: hex(dominant),
    date: x.DateTimeOriginal ? new Date(x.DateTimeOriginal).toISOString() : null,
    exif: {
      camera: [x.Make, x.Model].filter(Boolean).join(' ').replace(/^(\w+) \1/i, '$1') || null,
      lens: x.LensModel || null,
      focal: x.FocalLength ? `${Math.round(x.FocalLength)} mm` : null,
      aperture: x.FNumber ? `f/${+x.FNumber.toFixed(1)}` : null,
      shutter: t ? (t < 1 ? `1/${Math.round(1 / t)} s` : `${t} s`) : null,
      iso: x.ISO ? `ISO ${x.ISO}` : null,
    },
  };
}

await fs.rm(DIST, { recursive: true, force: true });
await fs.cp('site', DIST, { recursive: true });

const albums = [];
for (const d of await fs.readdir(PHOTOS, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('.')) continue;
  const dir = path.join(PHOTOS, d.name);
  const files = (await fs.readdir(dir)).filter(f => EXT.test(f)).sort();
  if (!files.length) continue;
  const meta = await readJson(path.join(dir, 'album.json'));
  const id = slug(d.name);
  const photos = [];
  for (const f of files) { console.log(`${d.name}/${f}`); photos.push(await processPhoto(path.join(dir, f), id)); }
  photos.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const cover = meta.cover ? photos.find(p => p.thumb.includes(`/${slug(path.parse(meta.cover).name)}-t`)) : null;
  albums.push({
    id, title: meta.title || pretty(d.name), description: meta.description || '',
    cover: (cover || photos[0]).thumb, color: (cover || photos[0]).color,
    date: photos[0].date, photos,
  });
}
albums.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
await fs.writeFile(path.join(DIST, 'albums.json'), JSON.stringify({ albums }));
console.log(`Built ${albums.length} album(s).`);

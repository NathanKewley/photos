# Nath Kewley Photos

Photography portfolio for GitHub Pages. Every subfolder of `photos/` becomes an album.

## Use
1. Create a repo and push this project to `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Add photos as `photos/<album-name>/*.jpg` and push. The workflow builds thumbnails, reads EXIF and deploys.

Optional `photos/<album-name>/album.json`:
```json
{ "title": "Iceland 2025", "description": "Ring road, September.", "cover": "IMG_0042.jpg" }
```

Tip: export originals at about 3000–4000px on the long edge to keep the repo small.

## Preview locally
```
npm install && npm run build && npx serve dist
```

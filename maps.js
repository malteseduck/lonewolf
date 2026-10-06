import * as Ink from './shared/ink.js';

/* A book's printed map repainted as sepia ink: lightness becomes ink depth, water is pushed a
   shade darker so coasts still read, and strong red survives as a faint rubric (flags, banners).
   Then the parchment grain is multiplied over it. crop is in image pixels. */
const DARK = [38, 25, 14], LIGHT = [236, 222, 186], RUBRIC = [146, 40, 24];
export function printedCanvas(img, crop, w, h) {
  const cv = Ink.canvas(w, h), x = cv.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const water = Math.max(0, Math.min(1, (b - r - 25) / 110)), red = Math.max(0, Math.min(1, (r - g - 60) / 90));
    const v = Math.max(0, Math.min(1, ((0.3 * r + 0.55 * g + 0.15 * b) / 255 - water * 0.24 - 0.5) * 1.3 + 0.56));
    for (let k = 0; k < 3; k++) { const o = DARK[k] + (LIGHT[k] - DARK[k]) * v; p[i + k] = o + (RUBRIC[k] - o) * red * 0.75; }
  }
  x.putImageData(d, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.7;
  x.drawImage(Ink.parchment(w, h, false, true), 0, 0);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  const g = x.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.68);
  g.addColorStop(0, 'rgba(40,24,10,0)'); g.addColorStop(1, 'rgba(40,24,10,0.6)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return cv;
}

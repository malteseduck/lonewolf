/* The tool pages' materials, from the player's own (shared/ink.js): the map's parchment, and the #burn
   filter that makes the charred rim round the window ragged (admin.css body::before). The parchment's own
   burnt edges are cut off here; admin.css burns the edges itself, so they fit a sheet of any size. */
import * as Ink from '../../shared/ink.js';

const root = document.documentElement.style;
const p = Ink.parchment(1200, 1500, false, true), c = Ink.canvas(900, 1200);
c.getContext('2d').drawImage(p, 150, 150, 900, 1200, 0, 0, 900, 1200);
root.setProperty('--parch', `url(${c.toDataURL('image/jpeg', 0.86)})`);

document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="burn" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="4" seed="7"/>
    <feDisplacementMap in="SourceGraphic" scale="34" xChannelSelector="R" yChannelSelector="G"/>
  </filter></svg>`);

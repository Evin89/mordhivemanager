import { Warband } from '../types';
import { BattleRow } from './battles';
import { earnedSeals, seals } from './seals';
import { computeWarbandRating, countModels } from './rating';
import { getWarbandTypeName } from '../data/warbandRegistry';
import { resolvePortraitSrc } from '../data/portraits';

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const timeout = window.setTimeout(() => resolve(null), 5000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    image.src = src;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not render dossier.')), 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

export async function createShareCard(warband: Warband, battles: BattleRow[] | null): Promise<File> {
  let displayFont = 'serif';
  let labelFont = 'serif';
  try {
    await Promise.all([
      document.fonts.load('64px "Grenze Gotisch"'),
      document.fonts.load('28px "Barlow Condensed"'),
    ]);
    displayFont = '"Grenze Gotisch", serif';
    labelFont = '"Barlow Condensed", serif';
  } catch {
    // The browser's serif remains usable when web fonts are unavailable.
  }
  const leader = warband.heroes.find(hero => hero.isLeader);
  const portraitSrc = leader ? resolvePortraitSrc(leader, warband) : null;
  const [portrait, wax] = await Promise.all([
    portraitSrc ? loadImage(portraitSrc) : Promise.resolve(null),
    loadImage('/img/seal-wax.png'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');

  function text(value: string, x: number, y: number, maxWidth: number, size: number, display = false) {
    const ctx = context!;
    ctx.font = `${size}px ${display ? displayFont : labelFont}`;
    while (ctx.measureText(value).width > maxWidth && size > 18) {
      size -= 1;
      ctx.font = `${size}px ${display ? displayFont : labelFont}`;
    }
    // Ellipsize exceptionally long names rather than letting them cross the frame.
    if (ctx.measureText(value).width > maxWidth) {
      while (value.length && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
      value += '…';
    }
    ctx.fillText(value, x, y);
  }

  function draw(includePortrait: boolean, includeWax = true) {
    const ctx = context!;
    ctx.fillStyle = '#14110E';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.strokeStyle = '#C39A2A';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 1152, 582);
    ctx.lineWidth = 1;
    ctx.strokeRect(33, 33, 1134, 564);
    ctx.fillStyle = '#E0BD55';
    text(getWarbandTypeName(warband.warbandType), 64, 85, 850, 30);
    ctx.fillStyle = '#E3D6B4';
    text(warband.name, 64, 170, 820, 76, true);
    ctx.fillStyle = '#E0BD55';
    text(`RATING  ${computeWarbandRating(warband)}     MODELS  ${countModels(warband)}`, 64, 240, 790, 32);
    if (battles) {
      const wins = battles.filter(battle => battle.result === 'win').length;
      const draws = battles.filter(battle => battle.result === 'draw').length;
      const losses = battles.filter(battle => battle.result === 'loss').length;
      text(`W–D–L  ${wins}–${draws}–${losses}`, 64, 286, 790, 30);
    }
    if (leader) {
      ctx.fillStyle = '#E3D6B4';
      text(`Leader: ${leader.name}`, 64, 342, 790, 32);
    }
    if (includePortrait && portrait) {
      const side = Math.min(portrait.naturalWidth, portrait.naturalHeight);
      ctx.drawImage(portrait, (portrait.naturalWidth - side) / 2, (portrait.naturalHeight - side) / 2, side, side, 914, 100, 210, 210);
    }
    ctx.fillStyle = '#E0BD55';
    const earned = earnedSeals(warband, battles ?? []);
    seals.filter(seal => earned.includes(seal.id)).slice(0, 4).forEach((seal, index) => {
      text(seal.name, 64 + (index % 2) * 410, 412 + Math.floor(index / 2) * 48, 390, 29);
    });
    if (includeWax && wax) ctx.drawImage(wax, 970, 410, 122, 122);
    ctx.fillStyle = '#E3D6B4';
    text('hive.mordheimmanager.net', 64, 557, 800, 30);
  }

  draw(true);
  let blob: Blob;
  try {
    blob = await canvasBlob(canvas);
  } catch {
    // Resetting the backing store clears taint before retrying without the portrait.
    canvas.width = 1200;
    canvas.height = 630;
    draw(false);
    try {
      blob = await canvasBlob(canvas);
    } catch {
      canvas.width = 1200;
      canvas.height = 630;
      draw(false, false);
      blob = await canvasBlob(canvas);
    }
  }
  const slug = warband.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'warband';
  return new File([blob], `${slug}-dossier.png`, { type: 'image/png' });
}

export async function shareDossier(warband: Warband, battles: BattleRow[] | null) {
  const file = await createShareCard(warband, battles);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: warband.name });
    return;
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

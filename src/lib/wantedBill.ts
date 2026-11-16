import type { CampaignAgenda } from './soloAgenda';
import { dossierEntries, normalizeHive, sectorName, type HiveState, type NemesisHero } from './hiveCampaign';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 5000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = src;
  });
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not render bill.')), 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

export async function createWantedBill(hero: NemesisHero, state: HiveState, agenda: CampaignAgenda, faction: string, portraitSrc: string | null): Promise<File> {
  const hive = normalizeHive(state);
  await Promise.all([
    document.fonts.load('90px "Grenze Gotisch"'),
    document.fonts.load('26px "Libre Caslon Text"'),
    document.fonts.load('30px "Barlow Condensed"'),
  ]).catch(() => undefined);
  const [portrait, frame] = await Promise.all([
    portraitSrc ? loadImage(portraitSrc) : Promise.resolve(null),
    loadImage('/img/portrait-frame.png'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1400;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  function draw(images: boolean) {
    const ctx = context!;
    ctx.fillStyle = '#E3D6B4';
    ctx.fillRect(0, 0, 1000, 1400);
    ctx.strokeStyle = '#2A1D12';
    ctx.lineWidth = 4;
    ctx.strokeRect(25, 25, 950, 1350);
    ctx.fillStyle = '#2A1D12';
    ctx.textAlign = 'center';
    ctx.font = '90px "Grenze Gotisch", serif';
    ctx.fillText('WANTED', 500, 125);
    // The frame art is 1185x1239 with a round opening; clip the portrait to that
    // opening (same proportions as the .portrait-photo rule in index.css).
    const frameX = 365;
    const frameY = 135;
    const frameW = 270;
    const frameH = Math.round(frameW * 1239 / 1185);
    const photoSize = frameW * 0.62;
    const photoX = frameX + frameW * 0.184;
    const photoY = frameY + frameH * 0.1985;
    if (images && portrait) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(portrait, photoX, photoY, photoSize, photoSize);
      ctx.restore();
    }
    if (images && frame) ctx.drawImage(frame, frameX, frameY, frameW, frameH);
    ctx.font = '48px "Grenze Gotisch", serif';
    ctx.fillText(hero.name, 500, 465, 850);
    ctx.font = '30px "Barlow Condensed", sans-serif';
    ctx.fillText(`${hero.role} · ${faction}`, 500, 510, 850);
    ctx.fillText(`Last seen: ${sectorName(hive.lastSeen)}`, 500, 550);
    ctx.fillText(`${hero.battles} battles · ${hero.timesDown} times down · ${hero.scars} scars${hero.grudge ? ' · holds a grudge' : ''}`, 500, 590, 850);
    if (hero.status === 'dead') {
      ctx.fillStyle = '#7A1F1A';
      ctx.font = '48px "Barlow Condensed", sans-serif';
      ctx.fillText('DECEASED', 500, 350);
    }
    ctx.textAlign = 'left';
    let y = 650;
    for (const item of dossierEntries(agenda, hive.outcome ? 8 : hive.clues)) {
      ctx.fillStyle = '#2A1D12';
      ctx.font = '30px "Barlow Condensed", sans-serif';
      ctx.fillText(`${item.name}${item.open ? '' : ` · ${item.needed} clues`}`, 70, y);
      y += 35;
      if (!item.open) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(70, y - 20, 740, 25);
        y += 65;
        continue;
      }
      ctx.font = '24px "Libre Caslon Text", serif';
      const words = item.text.split(/\s+/);
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > 850 && line) {
          ctx.fillText(line, 70, y);
          y += 29;
          line = word;
        } else {
          line = candidate;
        }
      }
      ctx.fillText(line, 70, y);
      y += 55;
    }
  }
  draw(true);
  let blob: Blob;
  try {
    blob = await blobFromCanvas(canvas);
  } catch {
    canvas.width = 1000;
    canvas.height = 1400;
    draw(false);
    blob = await blobFromCanvas(canvas);
  }
  const slug = hero.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leader';
  return new File([blob], `${slug}-wanted.png`, { type: 'image/png' });
}

export async function shareWantedBill(hero: NemesisHero, state: HiveState, agenda: CampaignAgenda, faction: string, portrait: string | null) {
  const file = await createWantedBill(hero, state, agenda, faction, portrait);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `${hero.name} — WANTED` });
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

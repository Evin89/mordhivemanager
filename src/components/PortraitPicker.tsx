import { useEffect, useRef, useState } from 'react';
import { Hero, Warband } from '../types';
import { defaultPortraitIndex, PORTRAIT_SETS, portraitUrl, resolvePortraitSrc } from '../data/portraits';
import { processPortraitPhoto } from '../lib/portraitPhoto';
import Portrait from './Portrait';
import { Button } from './ui';

export default function PortraitPicker({ hero, warband, onChange, onClose }: {
  hero: Hero; warband: Warband; onChange: (value: string | null) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    alive.current = true;
    dialog.current?.showModal();
    return () => { alive.current = false; dialog.current?.close(); previous?.focus(); };
  }, []);
  const set = PORTRAIT_SETS[warband.warbandType];
  const defaultIndex = defaultPortraitIndex(hero, warband);
  async function upload(file?: File) {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const photo = await processPortraitPhoto(file);
      if (alive.current) onChange(photo);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Unable to process this photo.');
    } finally { if (alive.current) setProcessing(false); }
  }
  return <dialog ref={dialog} className="portrait-picker" aria-modal="true" aria-labelledby="portrait-title" onCancel={onClose}>
    <h2 id="portrait-title">Portrait</h2>
    <Portrait large src={resolvePortraitSrc(hero, warband)} alt={hero.name} />
    <fieldset disabled={processing}>
      <legend>From your warband</legend>
      {set ? <div className="portrait-choices">{set.faces.map(face => {
        const selected = hero.portrait === `preset:${face.index}` || (hero.portrait == null && face.index === defaultIndex);
        return <button type="button" key={face.index} aria-pressed={selected} onClick={() => { setError(null); onChange(face.index === defaultIndex ? null : `preset:${face.index}`); }}>
          <img src={portraitUrl(warband.warbandType, face.index)} alt="" loading="lazy" decoding="async" />
          <span>{face.label}</span>{face.index === defaultIndex && <small>Default</small>}
        </button>;
      })}</div> : <p>No default faces are available for this warband.</p>}
      <h3>Your own photo</h3>
      <Button type="button" onClick={() => input.current?.click()}>Upload a photo</Button>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
      <p>Photos are stored with your warband.</p>
      <Button type="button" variant="secondary" aria-pressed={hero.portrait === 'none'} onClick={() => { setError(null); onChange('none'); }}>No portrait</Button>
    </fieldset>
    <p role="status" aria-live="polite">{processing ? 'Processing…' : ''}</p>
    {error && <p role="alert">{error}</p>}
    <Button type="button" variant="secondary" onClick={onClose}>Done</Button>
  </dialog>;
}

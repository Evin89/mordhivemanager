import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GALLERY_PAGE, GalleryCard, loadGalleryPage } from '../lib/gallery';
import { getWarbandTypeName, warbandDefinitionsByName } from '../data/warbandRegistry';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button, Select } from '../components/ui';

/** Public warbands from every player, newest first. Readable without signing in. */
export default function GalleryScreen() {
  const [type, setType] = useState('');
  const [cards, setCards] = useState<GalleryCard[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCards(null);
    loadGalleryPage(type).then((res) => {
      if (!active) return;
      setCards(res.cards);
      setMore(res.cards.length === GALLERY_PAGE);
      setError(res.error);
    });
    return () => {
      active = false;
    };
  }, [type]);

  async function loadMore() {
    if (!cards?.length) return;
    setBusy(true);
    const res = await loadGalleryPage(type, cards[cards.length - 1].updatedAt);
    setBusy(false);
    setCards([...cards, ...res.cards]);
    setMore(res.cards.length === GALLERY_PAGE);
    setError(res.error);
  }

  return (
    <div className="space-y-6">
      <BannerHeader as="h1">Gallery</BannerHeader>

      <Plate className="p-4">
        <label className="block">
          <span className="block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1">Warband list</span>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All warbands</option>
            {warbandDefinitionsByName.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </label>
      </Plate>

      {error && (
        <p className="font-body text-ink border-l-4 border-banner pl-3" role="alert">
          {error}
        </p>
      )}

      {cards === null ? (
        <p className="font-body text-ink-faded" role="status">Loading warbands…</p>
      ) : cards.length === 0 ? (
        <Plate className="p-4">
          <p className="font-body text-ink text-body-min">
            No public warbands {type ? 'of this list ' : ''}yet. Make yours public from its roster to be the first.
          </p>
        </Plate>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <Link key={c.id} to={`/gallery/${c.id}`} className="block">
              <Plate className="p-4 h-full hover:bg-page transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display uppercase tracking-[0.04em] text-ink text-lg truncate">{c.name}</h2>
                    <p className="font-body text-ink-faded text-sm truncate">{getWarbandTypeName(c.warbandType)}</p>
                    <p className="font-body text-ink-faded text-sm truncate">{c.ownerName}</p>
                  </div>
                  <PageChip>Rating {c.rating}</PageChip>
                </div>
              </Plate>
            </Link>
          ))}
        </div>
      )}

      {more && (
        <div className="max-w-xs">
          <Button variant="secondary" disabled={busy} onClick={loadMore}>
            {busy ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}

import type { Warband } from '../types';
import { deck, Endeavour, redraw } from '../lib/endeavours';
import { Button, Select } from './ui';
import { SoloPlate } from './SoloNote';

type Props = {
  warband: Warband;
  cards: Endeavour[];
  onChange: (cards: Endeavour[]) => void;
  onLog: (text: string) => void;
};

/** The drawn Foolish Endeavours for one warband. Card text is shown exactly as
 *  it stands in foolishEndeavours.json; the controls sit below each card. */
export default function EndeavourCards({ warband, cards, onChange, onLog }: Props) {
  if (!cards.length) return null;
  const mulliganUsed = cards.some(h => h.mulliganUsed);
  const achieved = cards.filter(h => h.completed).length;
  const modelName = (id: string | null) =>
    warband.heroes.find(h => h.id === id)?.name ?? warband.henchmenGroups.find(g => g.id === id)?.groupName ?? '';
  const patch = (cardId: string, change: Partial<Endeavour>) =>
    onChange(cards.map(h => (h.cardId === cardId ? { ...h, ...change } : h)));

  return (
    <SoloPlate>
      <details open>
        <summary className="font-heading text-xl cursor-pointer min-h-[44px]">
          {warband.name} · Foolish Endeavours ({achieved}/{cards.length})
        </summary>
        <div className="space-y-4 mt-2">
          {cards.map(held => {
            const c = deck.cards.find(card => card.id === held.cardId);
            if (!c) return null;
            return (
              <div key={c.id} className="space-y-2">
                <article className="endeavour-card p-3 space-y-2">
                  <h3 className="font-heading text-xl">{c.number} · {c.title}</h3>
                  <p className="font-body italic text-sm whitespace-pre-wrap">{c.flavour}</p>
                  <p className="font-body text-sm whitespace-pre-wrap">{c.rules}</p>
                </article>
                {held.completed ? (
                  <p className="font-ui text-brass-text">✓ Achieved by {modelName(held.modelId)}</p>
                ) : (
                  <>
                    <Select
                      aria-label={`Model earning ${c.title}`}
                      value={held.modelId ?? ''}
                      onChange={e => patch(c.id, { modelId: e.target.value || null })}
                    >
                      <option value="">Who earned it?</option>
                      {warband.heroes.filter(h => h.status === 'active' || h.status === 'missNextGame').map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                      {warband.henchmenGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.groupName}</option>
                      ))}
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        disabled={!held.modelId}
                        onClick={() => {
                          patch(c.id, { completed: true });
                          onLog(`${warband.name}: ${c.title} achieved by ${modelName(held.modelId)}`);
                        }}
                      >
                        Mark achieved
                      </Button>
                      {!mulliganUsed && (
                        <Button variant="secondary" onClick={() => onChange(redraw(cards, c.id))}>Redraw</Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </SoloPlate>
  );
}

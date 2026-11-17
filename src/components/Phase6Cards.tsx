import type { BattleSession } from '../store/battle';
import { alarmEvents, keepAlarmChoice } from '../lib/alarmEvents';
import { clockCard, keepClockChoice } from '../lib/clockDeck';
import { drawIntel, intelCard } from '../lib/intel';
import { SoloPlate } from './SoloNote';
import { Button } from './ui';

/** Foresight: two cards on the table, keep one. */
export function ForesightChoice({ session, playerType, update }: {
  session: BattleSession;
  playerType: string;
  update: (next: BattleSession) => void;
}) {
  const choice = session.pendingChoice;
  if (!choice) return null;
  const card = (id: string) => choice.deck === 'alarm' ? alarmEvents.find(e => e.id === id) : clockCard(id);
  return (
    <div className="cogitator" role="status">
      <SoloPlate>
        <h2 className="font-heading text-3xl">Foresight</h2>
        <p>{choice.deck === 'alarm' ? 'An alarm event' : 'A Reckoning card'} is coming. You see two; keep one. The other goes to the bottom of the deck.</p>
        {choice.ids.map(id => (
          <div key={id} className="space-y-1 border-t border-current/20 pt-2">
            <p className="font-ui">{card(id)?.name}</p>
            <p>{card(id)?.effect}</p>
            <Button variant="secondary" onClick={() => update(choice.deck === 'alarm' ? keepAlarmChoice(session, id, playerType) : keepClockChoice(session, id))}>
              Keep {card(id)?.name}
            </Button>
          </div>
        ))}
      </SoloPlate>
    </div>
  );
}

/** The Reckoning deck: the card in play and what is left. */
export function ReckoningClock({ session }: { session: BattleSession }) {
  if (!session.clockDeck) return null;
  const current = session.clockCard && session.clockCard.turn === session.turn ? clockCard(session.clockCard.id) : null;
  const lastStepIn = session.clockDeck.includes('last-step')
    || (session.pendingChoice?.deck === 'clock' && session.pendingChoice.ids.includes('last-step'));
  return (
    <div className="cogitator">
      <SoloPlate>
        <h2 className="font-heading text-3xl">The Reckoning</h2>
        <p>One card at the end of every turn. Take their leader out of action before The Last Step shows and it leaves the deck.</p>
        {current && <><p className="font-ui">{current.name}</p><p>{current.text} {current.effect}</p></>}
        <p>Cards left: {session.clockDeck.length} · {lastStepIn ? 'The Last Step is still in the deck.' : 'The Last Step is gone.'}</p>
      </SoloPlate>
    </div>
  );
}

/** Pre-battle: draw the optional intel card. */
export function IntelDraw({ session, update }: {
  session: BattleSession;
  update: (next: BattleSession) => void;
}) {
  if (!session.npcWarband) return null;
  const card = intelCard(session.intel?.card);
  const canRedraw = !!card && !session.intel?.redrawn && session.assets.includes('spy-network') && !session.started;
  return (
    <SoloPlate>
      <h2 className="font-heading text-2xl">Intel</h2>
      {!card ? <>
        <p>Before you go in, you may draw one intel card. Most help. Some do not. You do not have to.</p>
        <Button variant="secondary" disabled={session.started} onClick={() => update(drawIntel(session))}>Draw intel</Button>
      </> : <>
        <p className="font-ui">{card.name}</p>
        <p>{card.text}</p>
        <p>{card.effect}</p>
        {canRedraw && <Button variant="secondary" onClick={() => update(drawIntel(session))}>Spy Network: set it aside and draw again</Button>}
        {session.intel?.redrawn && <p>Spy Network used: this card stays.</p>}
      </>}
    </SoloPlate>
  );
}

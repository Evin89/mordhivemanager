import type { BattleSession, Contact } from '../store/battle';
import { revealContacts } from '../lib/battleEncounters';
import { behaviourSteps } from '../lib/behaviours';
import { SoloPlate } from './SoloNote';
import ProfileBlock from './ProfileBlock';
import { Button } from './ui';
export function EncounterSetup({ session, update }: {
    session: BattleSession;
    update: (p: Partial<BattleSession>) => void;
}) {
    if (!session.npcWarband)
        return null;
    return <SoloPlate>
    <h2 className="font-heading text-2xl">Contacts and strangers</h2>
    <label className="flex items-center gap-2 min-h-[44px]">
      <input type="checkbox" checked={session.hiddenContacts} onChange={e => update({ hiddenContacts: e.target.checked, contacts: [] })}/>
      Hidden contacts
    </label>
    <label className="flex items-center gap-2 min-h-[44px]">
      <input type="checkbox" checked={session.thirdPartyEnabled} onChange={e => update({ thirdPartyEnabled: e.target.checked })}/>
      Strangers in the ruins
    </label>
  </SoloPlate>;
}
export function HiddenContact({ contact, session, update }: {
    contact: Contact;
    session: BattleSession;
    update: (p: Partial<BattleSession>) => void;
}) {
    return <li className="space-y-2">
    <p>Contact {contact.letter} — unidentified</p>
    <Button variant="secondary" onClick={() => update(revealContacts(session, contact.letter))}>Reveal (a model of yours can see it)</Button>
  </li>;
}
export function ContactInstructions({ session, update }: {
    session: BattleSession;
    update: (p: Partial<BattleSession>) => void;
}) {
    if (!session.hiddenContacts)
        return null;
    return <SoloPlate>
    <p>Place a marker for each contact where the map shows it. Reveal a contact when one of your models has line of sight to it.</p>
    <Button variant="secondary" onClick={() => update(revealContacts(session))}>Reveal all</Button>
    <ul className="space-y-3">{session.contacts.filter(c => c.kind === 'echo' && !c.revealed).map(c => <HiddenContact key={c.letter} contact={c} session={session} update={update}/>)}</ul>
  </SoloPlate>;
}
export function Strangers({ session, update }: {
    session: BattleSession;
    update: (p: Partial<BattleSession>) => void;
}) {
    const party = session.thirdParty;
    if (!party)
        return null;
    if (party.gone || party.outOfAction >= party.count)
        return <SoloPlate><p>Strangers — {party.unitType}: {party.gone ? 'They have left.' : 'All out of action.'}</p></SoloPlate>;
    function casualties(delta: number) {
        if (party)
            update({ thirdParty: { ...party, outOfAction: Math.max(0, Math.min(party.count, party.outOfAction + delta)) } });
    }
    return <SoloPlate>
    <h2 className="font-heading text-2xl">Strangers</h2>
    <p>A {party.behaviour === 'beast' ? 'pack' : 'patrol'} of {party.unitType} — {party.listName}</p>
    <p>Targets the nearest model of any side. Activates after the enemy.</p>
    <p>Entry: {party.entry}</p>
    <ProfileBlock stats={party.stats} variant="collapsed"/>
    <p>Wargear: {party.equipment.length ? party.equipment.join(', ') : 'none'}</p>
    <div className="flex items-center gap-3">
      <Button aria-label="One fewer stranger out of action" onClick={() => casualties(-1)}>−</Button>
      <span>{party.outOfAction} / {party.count} out of action</span>
      <Button aria-label="One more stranger out of action" onClick={() => casualties(1)}>+</Button>
    </div>
    <ol>{behaviourSteps(party.behaviour).map(step => <li key={step}>{step.replace(/priority target/g, 'nearest model of any side').replace(/nearest enemy/g, 'nearest model of any side')}</li>)}</ol>
    <Button variant="secondary" onClick={() => update({ thirdParty: { ...party, gone: true } })}>They leave</Button>
  </SoloPlate>;
}

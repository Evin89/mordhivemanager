import { useEffect, useState } from 'react';
import type { BattleSession } from '../store/battle';
import './BattleMoments.css';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function CogitatorStartup({ session, update }: {
    session: BattleSession;
    update: (p: Partial<BattleSession>) => void;
}) {
    const [play] = useState(() => !session.cogitatorStarted && !reducedMotion());
    useEffect(() => {
        if (!session.cogitatorStarted)
            update({ cogitatorStarted: true });
    }, [session.cogitatorStarted, update]);
    return play ? <span className="cogitator-startup" aria-hidden="true"/> : null;
}
export function Seal({ visible }: {
    visible: boolean;
}) {
    return visible ? <div className="confirm-seal" role="status" aria-label="Battle recorded"><img src="/img/seal-wax.png" alt=""/></div> : null;
}
export async function stampSeal(show: () => void) {
    show();
    if (!reducedMotion())
        await new Promise(resolve => window.setTimeout(resolve, 900));
}
export function InjuryCounter({ roll, name, effect }: {
    roll: string;
    name: string;
    effect: string;
}) {
    const [digits, setDigits] = useState(String(roll));
    const [spinning, setSpinning] = useState(!reducedMotion());
    useEffect(() => {
        if (reducedMotion()) {
            setDigits(String(roll));
            setSpinning(false);
            return;
        }
        setSpinning(true);
        const started = performance.now();
        const timer = window.setInterval(() => {
            const elapsed = performance.now() - started;
            setDigits(`${elapsed >= 400 ? String(roll)[0] : 1 + Math.floor(elapsed / 45) % 6}${elapsed >= 600 ? String(roll)[1] : 1 + Math.floor(elapsed / 35) % 6}`);
            if (elapsed >= 600) {
                window.clearInterval(timer);
                setSpinning(false);
            }
        }, 35);
        return () => window.clearInterval(timer);
    }, [roll]);
    return <div className="injury-result" aria-live="polite"><strong className="tabular-nums">{digits}</strong>{!spinning && <span>{name}<span className="block font-body text-xs">{effect}</span></span>}</div>;
}

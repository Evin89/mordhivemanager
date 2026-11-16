import Plate from './Plate';
export default function SoloNote() { return <p className="font-body text-ink-faded text-xs"><span className="font-ui uppercase text-brass-text">App-original · Not part of the ruleset</span> — a table-side assistant for your game.</p>; }
export function SoloPlate({children}: {children: React.ReactNode}) { return <Plate className="p-3 space-y-3"><SoloNote />{children}</Plate>; }

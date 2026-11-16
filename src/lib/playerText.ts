/**
 * Rules text as players should see it.
 *
 * The data files keep "TODO: verify…" markers on purpose: they are the work
 * list for checking the transcription against the rulebook (see the data
 * conventions in src/data/types.ts). Players don't need them in the rules
 * reference, so they are stripped at display time and stay in the data.
 *
 * When a removed note says the text itself is incomplete (truncated, not yet
 * transcribed), the player gets a plain warning instead, so a cut-off rule
 * never reads as if it were complete.
 */
const INCOMPLETE = /truncat|missing|not (yet )?transcribed/i;
export const INCOMPLETE_NOTICE = 'This text is incomplete here; check the rulebook.';

export function playerText(text: string): string {
  let incomplete = false;
  const note = (todo: string) => {
    if (INCOMPLETE.test(todo)) incomplete = true;
    return '';
  };
  const out = text
    // "(TODO: …)" asides, wherever they sit in a sentence.
    .replace(/\s*\(TODO:?[^)]*\)/g, note)
    // "TODO: …" sentences, up to the end of the sentence or the text.
    .replace(/\s*\bTODO:?\s[^]*?(?:\.(?=\s|$)|$)/g, note)
    .replace(/\s+([.,;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return incomplete ? `${out ? `${out} ` : ''}${INCOMPLETE_NOTICE}` : out;
}

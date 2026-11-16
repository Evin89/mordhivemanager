import deck from '../data/foolishEndeavours.json';
export { deck };
export type Endeavour = { cardId: string; completed: boolean; modelId: string | null; mulliganUsed: boolean; used?: boolean };
export function drawEndeavours(mode: 'none' | 'd3' | '2d3'): Endeavour[] {
 const d3 = () => 1+Math.floor(Math.random()*3);
 const n = mode === 'none' ? 0 : d3() + (mode === '2d3' ? d3() : 0);
 const pool = [...deck.cards]; const cards: Endeavour[]=[];
 while(cards.length<n && pool.length) { const c=pool.splice(Math.floor(Math.random()*pool.length),1)[0]; cards.push({cardId:c.id,completed:false,modelId:null,mulliganUsed:false}); }
 return cards;
}
export function redraw(cards: Endeavour[], id: string): Endeavour[] {
 if(cards.some(c=>c.mulliganUsed)) return cards;
 const pool=deck.cards.filter(c=>!cards.some(held=>held.cardId===c.id));
 if(!pool.length) return cards;
 const replacement=pool[Math.floor(Math.random()*pool.length)];
 return cards.map(c=>c.cardId===id?{cardId:replacement.id,completed:false,modelId:null,mulliganUsed:true}:c);
}

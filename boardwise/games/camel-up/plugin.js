import {RACING_CAMELS, EDITIONS, validateSetup, simulateExact, displayCamelName} from './simulator.js';
export const VERSION = '0.2.0';
export const colors = {Blue:'#347fc0',Green:'#288569',Orange:'#e58a3c',Yellow:'#dfb638',White:'#d5d1c6',CrazyWhite:'#e6dcec',CrazyBlack:'#424551'};
export function label(c, edition='classic') { return edition === 'crazy' && c === 'White' ? 'Purple' : displayCamelName(c); }
export function color(c, edition='classic') { return edition === 'crazy' && c === 'White' ? '#9862bb' : colors[c]; }
export function preset(id='opening', edition='classic') {
  const placements = id === 'finish' ? [[15,0],[14,0],[12,0],[11,0],[10,0]] : id === 'stack' ? [[6,0],[6,1],[7,0],[4,0],[3,0]] : [[2,0],[3,0],[2,1],[1,0],[3,1]];
  const positions = Object.fromEntries(RACING_CAMELS.map((c,i)=>[c,{tile:placements[i][0],stack:placements[i][1]}]));
  if(edition==='crazy') Object.assign(positions,{CrazyWhite:{tile:15,stack:id==='finish'?1:0},CrazyBlack:{tile:16,stack:0}});
  return {schema:1, game:'camel-up', edition, positions, dice:[...EDITIONS[edition].dice], spectators:{}, payouts:Object.fromEntries(RACING_CAMELS.map(c=>[c,5]))};
}
export function validate(s) {
  if(!s || s.schema!==1 || s.game!=='camel-up' || !Object.hasOwn(EDITIONS,s.edition)) throw Error('This is not a supported BoardWise scenario.');
  if(!s.positions || typeof s.positions!=='object' || !Array.isArray(s.dice) || !s.spectators || typeof s.spectators!=='object' || Array.isArray(s.spectators)) throw Error('Scenario data is incomplete.');
  for(const c of EDITIONS[s.edition].activeCamels) {
    const p=s.positions[c];
    if(!p || !Number.isInteger(p.tile) || !Number.isInteger(p.stack)) throw Error('Camel positions must be whole numbers.');
  }
  if(Object.keys(s.positions).length!==EDITIONS[s.edition].activeCamels.length) throw Error('Scenario has unexpected camels.');
  if(Object.keys(s.spectators).some(k=>String(Number(k))!==k)) throw Error('Invalid spectator space.');
  const errors=validateSetup(s.positions,s.dice,s.spectators,s.edition);
  if(errors.length) throw Error(errors.join(' '));
  if(!s.payouts || RACING_CAMELS.some(c=>![0,2,3,5].includes(s.payouts[c]))) throw Error('Bet tickets must be 5, 3, 2, or unavailable.');
  // Return a clean schema, never trust extra imported fields.
  return {schema:1,game:'camel-up',edition:s.edition,positions:structuredClone(s.positions),dice:[...s.dice],spectators:{...s.spectators},payouts:Object.fromEntries(RACING_CAMELS.map(c=>[c,s.payouts[c]]))};
}
export function moveEditor(s,c,tile) {
  const next=structuredClone(s), old=next.positions[c].tile;
  delete next.positions[c];
  Object.entries(next.positions).filter(([,p])=>p.tile===old).sort((a,b)=>a[1].stack-b[1].stack).forEach(([,p],i)=>p.stack=i);
  next.positions[c]={tile,stack:Object.values(next.positions).filter(p=>p.tile===tile).length};
  return validate(next);
}
export function reorder(s,c,delta) {
  const next=structuredClone(s), p=next.positions[c];
  const other=Object.entries(next.positions).find(([k,q])=>k!==c&&q.tile===p.tile&&q.stack===p.stack+delta);
  if(other) {other[1].stack=p.stack; p.stack+=delta;}
  return validate(next);
}
export function legEV(probabilities, payout) {
  if(![2,3,5].includes(payout)) return null;
  return payout*probabilities[0]+probabilities[1]-probabilities.slice(2).reduce((a,b)=>a+b,0);
}
export function analyze(s) {
  s=validate(s);
  const result=simulateExact(s.positions,s.dice,s.spectators,{editionId:s.edition});
  return {...result, rows:RACING_CAMELS.map(c=>{const p=result.counts[c].map(n=>n/result.totalWeight);return {camel:c,p,ev:legEV(p,s.payouts[c])};})};
}
export const camelUp={id:'camel-up', title:'Camel Up', editions:EDITIONS, preset,validate,analyze};

import {preset,analyze} from './plugin.js';
import {RACING_CAMELS as racers} from './simulator.js';
export function practiceAnswer(result,kind='odds') {
 const value=r=>kind==='ev'?r.ev:r.p[0], rows=result.rows.filter(r=>value(r)!==null);
 const best=Math.max(...rows.map(value)), leaders=rows.filter(r=>Math.abs(value(r)-best)<1e-12);
 return leaders.length>1?'Tie':leaders[0].camel;
}
export function makePractice(seed,kind='odds') {
 if(!Number.isInteger(seed)||seed<0||seed>4294967295||!['odds','ev'].includes(kind))throw Error('Invalid practice settings.');
 let n=seed>>>0;const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 let state,result;
 for(let attempt=0;attempt<12;attempt++){
  state=preset();const heights={};
  for(const c of racers){const tile=4+Math.floor(rand()*5);state.positions[c]={tile,stack:heights[tile]||0};heights[tile]=(heights[tile]||0)+1;state.payouts[c]=[2,3,5][Math.floor(rand()*3)];}
  const shuffled=[...racers];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  state.dice=shuffled.slice(0,2+Math.floor(rand()*2));
  result=analyze(state);const highest=Math.max(...result.rows.map(r=>r.p[0]));if(highest<.95)break;
 }
 return {state,result,seed,kind,answer:practiceAnswer(result,kind)};
}

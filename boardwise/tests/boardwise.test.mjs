import test from 'node:test';
import assert from 'node:assert/strict';
import {buildState,moveCamel,moveGrayDie,rankRacingCamels,simulateExact,RACING_CAMELS as C,EDITIONS} from '../games/camel-up/simulator.js';
import {preset,validate,moveEditor,reorder,analyze,legEV} from '../games/camel-up/plugin.js';
const setup=rows=>Object.fromEntries(C.map((c,i)=>[c,{tile:rows[i][0],stack:rows[i][1]}]));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('Carrying preserves order, leaves lower camels behind and does not mutate input',()=>{
 const p=setup([[4,0],[4,1],[4,2],[6,0],[1,0]]),s=buildState(p),m=moveCamel(s,'Green',2);
 assert.deepEqual(s.stacks.get(4),['Blue','Green','Orange']);assert.deepEqual(m.state.stacks.get(4),['Blue']);assert.deepEqual(m.state.stacks.get(6),['Yellow','Green','Orange']);
});
test('Oasis stacks above; mirage stacks underneath',()=>{
 const s=buildState(setup([[4,0],[4,1],[6,0],[2,0],[1,0]]));
 assert.deepEqual(moveCamel(s,'Blue',1,{5:'oasis'}).state.stacks.get(6),['Orange','Blue','Green']);
 assert.deepEqual(moveCamel(s,'Blue',3,{7:'mirage'}).state.stacks.get(6),['Blue','Green','Orange']);
});
test('Crazy die chooses the carrier even when the face names the other camel',()=>{
 const s=buildState({...setup([[6,1],[8,0],[9,0],[10,0],[11,0]]),CrazyWhite:{tile:6,stack:0},CrazyBlack:{tile:14,stack:0}},'crazy');
 const m=moveGrayDie(s,'black',2);assert.equal(m.camel,'CrazyWhite');assert.deepEqual(m.state.stacks.get(4),['CrazyWhite','Blue']);
});
test('Directly stacked crazy camels move only the upper camel',()=>{
 const s=buildState({...setup([[6,2],[8,0],[9,0],[10,0],[11,0]]),CrazyWhite:{tile:6,stack:0},CrazyBlack:{tile:6,stack:1}},'crazy');
 const m=moveGrayDie(s,'white',2);assert.equal(m.camel,'CrazyBlack');assert.deepEqual(m.state.stacks.get(6),['CrazyWhite']);assert.deepEqual(m.state.stacks.get(4),['CrazyBlack','Blue']);
});
test('Backward finish stops immediately and carried racers rank last, without wrapping',()=>{
 const p={...setup([[1,1],[8,0],[9,0],[10,0],[11,0]]),CrazyWhite:{tile:1,stack:0},CrazyBlack:{tile:14,stack:0}};
 const m=moveGrayDie(buildState(p,'crazy'),'black',2);assert.equal(m.crossedFinish,true);assert.equal(m.finalDestination,-1);assert.equal(rankRacingCamels(m.state).at(-1),'Blue');
 const r=simulateExact(p,['Gray','Blue'],{},{editionId:'crazy'});assert.equal(r.totalWeight,12);assert.equal(r.counts.Blue[4],12);
});
test('A lone Crazy Camel crossing backwards ends the race',()=>{
 const s=buildState({...setup([[3,0],[5,0],[7,0],[9,0],[11,0]]),CrazyWhite:{tile:1,stack:0},CrazyBlack:{tile:14,stack:0}},'crazy');
 assert.equal(moveGrayDie(s,'white',1).crossedFinish,true);
});
test('Forward finish terminates before the next die and conserves suffix weights',()=>{
 const p=setup([[16,0],[15,0],[10,0],[9,0],[8,0]]),r=simulateExact(p,['Blue','Green']);
 assert.equal(r.totalWeight,18);assert.equal(r.counts.Blue[0],9);assert.equal(r.counts.Green[0],9);
});
test('One-die hand calculation and EV',()=>{
 const s=preset();s.positions=setup([[6,0],[8,0],[3,0],[2,0],[1,0]]);s.dice=['Blue'];const r=analyze(s);
 assert.deepEqual(r.counts.Blue,[2,1,0,0,0]);close(r.rows.find(r=>r.camel==='Blue').ev,11/3);
 s.spectators={9:'mirage'};assert.deepEqual(analyze(s).counts.Blue,[1,2,0,0,0]);
 close(legEV([.1,.2,.3,.2,.2],5),0);assert.equal(legEV([1,0,0,0,0],0),null);
});
test('All rank marginals conserve exact integer weight for both editions and every die subset',()=>{
 for(const edition of ['classic','crazy']){
  const s=preset('opening',edition),all=EDITIONS[edition].dice;
  for(let mask=0;mask<2**all.length;mask++){
   const dice=all.filter((_,i)=>mask&(1<<i)),r=simulateExact(s.positions,dice,s.spectators,{editionId:edition});
   for(const c of C)assert.equal(r.counts[c].reduce((a,b)=>a+b,0),r.totalWeight);
   for(let rank=0;rank<5;rank++)assert.equal(C.reduce((n,c)=>n+r.counts[c][rank],0),r.totalWeight);
  }
 }
});
test('Die order does not affect probabilities',()=>{
 const s=preset('stack');assert.deepEqual(simulateExact(s.positions,s.dice).counts,simulateExact(s.positions,[...s.dice].reverse()).counts);
});
test('Second edition leaves one die unrolled at the leg end',()=>{
 const s=preset('opening','crazy'),r=simulateExact(s.positions,['Blue','Green'],{},{editionId:'crazy'});assert.equal(r.rollsToMake,1);assert.equal(r.totalWeight,12);
 const done=simulateExact(s.positions,['Gray'],{},{editionId:'crazy'});assert.equal(done.rollsToMake,0);assert.equal(done.totalWeight,1);
});
test('Editor moves one camel, renumbers the old stack, and reorders safely',()=>{
 const s=preset('stack'),m=moveEditor(s,'Blue',7);assert.equal(m.positions.Green.stack,0);assert.equal(m.positions.Blue.stack,1);assert.equal(m.positions.Orange.stack,0);assert.equal(s.positions.Blue.tile,6);
 const r=reorder(m,'Blue',-1);assert.equal(r.positions.Blue.stack,0);assert.equal(r.positions.Orange.stack,1);validate(r);
});
test('Rejects malformed import and illegal board instead of producing odds',()=>{
 assert.throws(()=>validate(null));const s=preset();s.spectators={5:'oasis',6:'mirage'};assert.throws(()=>validate(s));s.spectators={1:'oasis'};assert.throws(()=>validate(s));s.spectators={2:'oasis'};assert.throws(()=>validate(s));s.spectators={};s.positions.Blue.stack=6;assert.throws(()=>validate(s));
 const b=preset();b.dice.push('Blue');assert.throws(()=>validate(b));const p=preset();p.payouts.Blue=999;assert.throws(()=>validate(p));
});
test('All presets validate, including second-edition near finish stack',()=>{
 for(const e of ['classic','crazy'])for(const p of ['opening','stack','finish'])validate(preset(p,e));
});

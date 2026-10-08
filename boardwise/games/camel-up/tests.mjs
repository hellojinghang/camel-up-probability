import assert from 'node:assert/strict';
import {RACING_CAMELS, buildState, simulateExact, moveCamel, moveGrayDie} from './simulator.js';
import {calculateRaceRanges, relevantLayouts, rollOutcomes} from './race-range.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
const stack=(tile=16)=>Object.fromEntries(RACING_CAMELS.map((c,i)=>[c,{tile,stack:i}]));
const opts={timeLimitMs:3000,maxNodes:100000,maxDepth:3};
// Every roll ends the race: compare every rank with the independent leg engine.
for (const editionId of ['classic','crazy']) {
  const p=stack(); if(editionId==='crazy') Object.assign(p,{CrazyWhite:{tile:9,stack:0},CrazyBlack:{tile:8,stack:0}});
  const exact=simulateExact(p,RACING_CAMELS,{}, {editionId});
  const result=calculateRaceRanges(p,RACING_CAMELS,{}, {...opts,editionId,maxDepth:1});
  assert.equal(result.complete,true);
  for(const c of RACING_CAMELS) for(let r=0;r<5;r++) {
    close(result.ranges[c][r].low,exact.counts[c][r]/exact.totalWeight);
    close(result.ranges[c][r].high,exact.counts[c][r]/exact.totalWeight);
  }
}
// Two-roll hand calculation: Blue or Green is first with equal probability.
const p={Blue:{tile:16,stack:0},Green:{tile:15,stack:0},Orange:{tile:10,stack:0},Yellow:{tile:9,stack:0},White:{tile:8,stack:0}};
const r=calculateRaceRanges(p,['Blue','Green'],{},opts);
assert.equal(r.complete,true);close(r.ranges.Blue[0].low,.5);close(r.ranges.Green[0].high,.5);
// Pyramid refills at a leg boundary, instead of ranking the unfinished race.
const refill=calculateRaceRanges(stack(),[],{},opts);assert.equal(refill.complete,true);close(refill.ranges.White[0].low,1);
const cp={...stack(),CrazyWhite:{tile:9,stack:0},CrazyBlack:{tile:8,stack:0}};
const crazyRefill=calculateRaceRanges(cp,['Gray'],{}, {...opts,editionId:'crazy',maxDepth:1});
assert.equal(crazyRefill.complete,false); // Grey is restored with all five racing dice, not rolled alone.
close(crazyRefill.ranges.White[0].low,5/6);
// Deeper bounded enumeration can only tighten outer bounds.
const early=stack(2);
const a=calculateRaceRanges(early,RACING_CAMELS,{}, {...opts,maxDepth:1});
const b=calculateRaceRanges(early,RACING_CAMELS,{}, {...opts,maxDepth:2});
assert.equal(a.complete,false);
for(const c of RACING_CAMELS) for(let i=0;i<5;i++) {
 assert.ok(b.ranges[c][i].low>=a.ranges[c][i].low-1e-10);
 assert.ok(b.ranges[c][i].high<=a.ranges[c][i].high+1e-10);
}
// Placement pruning: compare all full legal board layouts against pruned layouts
// using their entire next-roll transition signatures, not just one outcome.
const state=buildState(p), outcomes=rollOutcomes(state,['Blue','Green']);
const signature=tiles=>JSON.stringify(outcomes.map(o=>{const m=o.move(tiles);return [m.crossedFinish,[...m.state.stacks].sort((a,b)=>a[0]-b[0])];}));
const pruned=new Set(relevantLayouts(state,outcomes).map(signature));
const full=new Set();
function all(t,tiles,last){if(t>16){full.add(signature(tiles));return;}all(t+1,tiles,last);if(!state.stacks.has(t)&&t!==last+1) for(const e of ['oasis','mirage']){tiles[t]=e;all(t+1,tiles,t);delete tiles[t];}}
all(2,{},-2);assert.deepEqual(full,pruned);
// Stacking changes on mirage, carrying and immediate finish remain active.
const q=buildState({Blue:{tile:14,stack:0},Green:{tile:14,stack:1},Orange:{tile:15,stack:0},Yellow:{tile:1,stack:0},White:{tile:2,stack:0}});
assert.deepEqual(moveCamel(q,'Blue',2,{16:'mirage'}).state.stacks.get(15),['Blue','Green','Orange']);
assert.equal(moveCamel(q,'Blue',2,{16:'oasis'}).crossedFinish,true);
const cstate=buildState({...p,CrazyWhite:{tile:16,stack:1},CrazyBlack:{tile:8,stack:1}},'crazy');
assert.equal(moveGrayDie(cstate,'white',1,{}).rawDestination,15);
const budget=calculateRaceRanges(early,RACING_CAMELS,{}, {...opts,maxNodes:1});
assert.equal(budget.complete,false);assert.equal(budget.reachedDepth,0);
assert.throws(()=>calculateRaceRanges({},[],{},opts));
console.log('All race-range and leg regression tests passed.');


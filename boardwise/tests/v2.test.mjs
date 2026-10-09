import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,analyze,validate,moveEditor} from '../games/camel-up/plugin.js';
import {compareResults,mergeBackup,scenarioKey} from '../core/playbook.js';
import {makePractice,practiceAnswer} from '../games/camel-up/practice.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12);
test('Comparison uses independent before/after probabilities and EV',()=>{
 const a=preset('stack'),b=moveEditor(a,'Blue',12);b.payouts.Blue=2;
 const before=analyze(a),after=analyze(b),delta=compareResults(before,after),r=delta.find(x=>x.camel==='Blue');
 near(r.delta,after.rows[0].p[0]-before.rows[0].p[0]);near(r.evDelta,after.rows[0].ev-before.rows[0].ev);
 assert.equal(a.positions.Blue.tile,6);assert.equal(a.payouts.Blue,5);
 near(delta.reduce((sum,r)=>sum+r.delta,0),0);
});
test('Identical snapshots compare to zero, unavailable tickets yield no EV delta',()=>{
 const a=preset(),result=analyze(a);assert.ok(compareResults(result,result).every(r=>r.delta===0&&r.evDelta===0));
 a.payouts.Blue=0;assert.equal(compareResults(result,analyze(a))[0].evDelta,null);
 assert.throws(()=>compareResults(result,analyze(preset('opening','crazy'))));
});
test('Generated exercises are deterministic, valid and engine-consistent across 100 seeds',()=>{
 for(let seed=0;seed<100;seed++)for(const kind of ['odds','ev']){
  const p=makePractice(seed,kind);validate(p.state);assert.deepEqual(p,makePractice(seed,kind));assert.deepEqual(p.result,analyze(p.state));
  const scores=p.result.rows.map(r=>kind==='ev'?r.ev:r.p[0]),max=Math.max(...scores),winners=scores.map((v,i)=>Math.abs(v-max)<1e-12?i:-1).filter(i=>i>=0);
  assert.equal(p.answer,winners.length>1?'Tie':p.result.rows[winners[0]].camel);
 }
});
test('Tie answers work for both odds and EV',()=>{
 const rows=[{camel:'Blue',p:[.5],ev:1},{camel:'Green',p:[.5],ev:1}];assert.equal(practiceAnswer({rows}),'Tie');assert.equal(practiceAnswer({rows},'ev'),'Tie');
});
const item=(name='Test',state=preset())=>({id:'old-id',name,date:'2026-10-09T00:00:00Z',state});
const backup=scenarios=>({format:'boardwise-playbook',version:1,scenarios});
test('Backup JSON roundtrip keeps complete legacy-compatible board and appends without overwriting',()=>{
 const a=item(),b=item('Crazy',preset('opening','crazy'));let id=0;const r=mergeBackup([a],JSON.parse(JSON.stringify(backup([a,b]))),()=>`new-${++id}`);
 assert.equal(r.added,1);assert.equal(r.skipped,1);assert.equal(r.scenarios[0].name,'Crazy');assert.deepEqual(r.scenarios[1],a);assert.equal(r.scenarios[0].id,'new-1');assert.deepEqual(r.scenarios[0].state,b.state);
});
test('Scenario deduplication ignores key and remaining-die order',()=>{
 const s=preset(),t={...s,positions:Object.fromEntries(Object.entries(s.positions).reverse()),dice:[...s.dice].reverse()};assert.equal(scenarioKey(s),scenarioKey(t));
 const r=mergeBackup([item('Test',s)],backup([item('Test',t)]),()=> 'new');assert.equal(r.added,0);
});
test('Malformed or over-limit backup fails atomically and preserves existing saves',()=>{
 const original=[item()],snapshot=structuredClone(original);const bad=item('bad');bad.state.positions.Blue.tile=99;
 assert.throws(()=>mergeBackup(original,backup([item('Good'),bad]),()=> 'new'));assert.deepEqual(original,snapshot);
 assert.throws(()=>mergeBackup(original,{format:'boardwise-playbook',version:2,scenarios:[]},()=> 'new'));
 assert.throws(()=>mergeBackup(original,backup(Array.from({length:100},(_,i)=>item(`New ${i}`))),()=> 'new'));
});
test('Comparison and backup preserve zero, negative EV and edited ticket payouts',()=>{
 const s=preset();s.payouts.Blue=0;s.payouts.Green=2;const r=mergeBackup([],backup([item('Payouts',s)]),()=> 'new');assert.equal(r.scenarios[0].state.payouts.Blue,0);assert.equal(r.scenarios[0].state.payouts.Green,2);
 assert.deepEqual(analyze(r.scenarios[0].state),analyze(s));
});

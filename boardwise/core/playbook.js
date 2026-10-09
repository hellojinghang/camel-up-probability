import {validate} from '../games/camel-up/plugin.js';
export function scenarioKey(s) {
 const clean=validate(s);
 return JSON.stringify({...clean,positions:Object.fromEntries(Object.entries(clean.positions).sort()),dice:[...clean.dice].sort(),spectators:Object.fromEntries(Object.entries(clean.spectators).sort())});
}
export function mergeBackup(existing, payload, makeId) {
 if(!payload || payload.format!=='boardwise-playbook' || payload.version!==1 || !Array.isArray(payload.scenarios) || payload.scenarios.length>100) throw Error('Unsupported playbook backup.');
 const incoming=payload.scenarios.map(x=>{
  if(!x || typeof x.name!=='string' || !x.name.trim() || x.name.length>70 || typeof x.date!=='string' || !Number.isFinite(Date.parse(x.date)))throw Error('A backup entry has an invalid name or date.');
  return {name:x.name.trim(),date:x.date,state:validate(x.state)};
 });
 const keys=new Set(existing.map(x=>x.name+'|'+scenarioKey(x.state))), additions=[];
 for(const x of incoming){const key=x.name+'|'+scenarioKey(x.state);if(!keys.has(key)){keys.add(key);additions.push({...x,id:makeId()});}}
 if(existing.length+additions.length>100)throw Error('Restore would exceed 100 saved scenarios. Export and remove some before restoring.');
 return {scenarios:[...additions,...existing],added:additions.length,skipped:incoming.length-additions.length};
}
export function compareResults(baseline,current) {
 if(baseline.editionId!==current.editionId) throw Error('Compare scenarios from the same edition.');
 return current.rows.map(r=>{
  const b=baseline.rows.find(x=>x.camel===r.camel);if(!b)throw Error('Comparison results are incomplete.');
  return {camel:r.camel,before:b.p[0],after:r.p[0],delta:r.p[0]-b.p[0],evBefore:b.ev,evAfter:r.ev,evDelta:b.ev===null||r.ev===null?null:r.ev-b.ev};
 });
}

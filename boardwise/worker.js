import {games} from './games/registry.js';
import {calculateRaceRanges} from './games/camel-up/race-range.js';
self.onmessage=({data:{id,type,state}})=>{
  try {
    const s=games[state.game].validate(state), start=performance.now();
    const result=type==='range'?calculateRaceRanges(s.positions,s.dice,s.spectators,{editionId:s.edition,timeLimitMs:8000,maxNodes:100000,onProgress:p=>self.postMessage({id,progress:p})}):games[s.game].analyze(s);
    self.postMessage({id,result,elapsed:performance.now()-start});
  }catch(e){self.postMessage({id,error:e.message});}
};

import { RACING_CAMELS, EDITIONS, GRAY_DIE, buildState, moveCamel, moveGrayDie,
  rankRacingCamels, rollsRemainingThisLeg, validateSetup } from './simulator.js';

// Anonymous placement envelope: entered tiles apply to the next roll. After
// that, any legal tile arrangement can be selected BEFORE each random roll.
// No ownership, turn scheduling or player-count restrictions are assumed.
// Because arrangements can be reconsidered every roll, only next-roll landing
// spaces matter. This pruning would NOT be valid for fixed whole-leg layouts.
export function rollOutcomes(state, dice) {
  const outcomes = [];
  for (const die of dice) {
    const colors = die === GRAY_DIE ? ['white', 'black'] : [null];
    for (const color of colors) for (let steps = 1; steps <= 3; steps++) {
      const move = tiles => die === GRAY_DIE
        ? moveGrayDie(state, color, steps, tiles) : moveCamel(state, die, steps, tiles);
      outcomes.push({ move, landing: move({}).rawDestination,
        remaining: dice.filter(d => d !== die), probability: 1 / dice.length / colors.length / 3 });
    }
  }
  return outcomes;
}

export function relevantLayouts(state, outcomes) {
  const spaces = [...new Set(outcomes.map(o => o.landing))]
    .filter(t => t >= 2 && t <= 16 && !state.stacks.has(t)).sort((a,b) => a-b);
  const layouts = [];
  function visit(index, tiles, last) {
    if (index === spaces.length) { layouts.push({...tiles}); return; }
    const tile = spaces[index];
    visit(index + 1, tiles, last);
    if (tile !== last + 1) for (const effect of ['oasis', 'mirage']) {
      tiles[tile] = effect;
      visit(index + 1, tiles, tile);
      delete tiles[tile];
    }
  }
  visit(0, {}, -2);
  return layouts;
}

const unknown = () => [Array(25).fill(0), Array(25).fill(1), Array(25).fill(0), Array(25).fill(1)];
function terminal(state) {
  const a = Array(25).fill(0);
  rankRacingCamels(state).forEach((c, rank) => { a[RACING_CAMELS.indexOf(c) * 5 + rank] = 1; });
  return [a, a, a, a];
}
const boardKey = state => [...state.stacks].sort((a,b) => a[0]-b[0])
  .map(([t,s]) => `${t}:${s.join(',')}`).join(';');

export function calculateRaceRanges(positions, remainingDice, spectators = {}, {
  editionId = 'classic', maxDepth = 40, maxNodes = 100000, timeLimitMs = 8000,
  onProgress = () => {},
} = {}) {
  const errors = validateSetup(positions, remainingDice, spectators, editionId);
  if (errors.length) throw Object.assign(new Error(errors.join('\n')), {validationErrors: errors});
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || !Number.isInteger(maxNodes) || maxNodes < 1 ||
      !Number.isFinite(timeLimitMs) || timeLimitMs <= 0) throw new Error('Invalid search limits.');
  const start = performance.now(), deadline = start + timeLimitMs;
  let nodes = 0, layoutsChecked = 0, reachedDepth = 0, last = unknown();
  const STOP = Symbol('budget');
  const initial = buildState(positions, editionId);
  function check() { if (nodes >= maxNodes || performance.now() >= deadline) throw STOP; }
  function solve(state, dice, depth, fixed, memo) {
    check();
    // End-of-leg: refill the pyramid; previous spectator tiles are removed.
    if (!rollsRemainingThisLeg(editionId, dice.length)) {
      dice = EDITIONS[editionId].dice;
      fixed = null;
    }
    if (!depth) return unknown();
    const key = `${depth}|${dice.join(',')}|${boardKey(state)}|${fixed ? JSON.stringify(fixed) : '*'}`;
    if (memo.has(key)) return memo.get(key);
    nodes++;
    const outcomes = rollOutcomes(state, dice);
    const layouts = fixed ? [fixed] : relevantLayouts(state, outcomes);
    const best = [Array(25).fill(1), Array(25).fill(1), Array(25).fill(0), Array(25).fill(0)];
    for (const tiles of layouts) {
      check(); layoutsChecked++;
      const sum = Array.from({length:4}, () => Array(25).fill(0));
      for (const outcome of outcomes) {
        const moved = outcome.move(tiles);
        const value = moved.crossedFinish ? terminal(moved.state)
          : solve(moved.state, outcome.remaining, depth - 1, null, memo);
        for (let k=0;k<4;k++) for (let j=0;j<25;j++) sum[k][j] += outcome.probability * value[k][j];
      }
      for (let k=0;k<4;k++) for (let j=0;j<25;j++) best[k][j] = k < 2
        ? Math.min(best[k][j], sum[k][j]) : Math.max(best[k][j], sum[k][j]);
    }
    memo.set(key, best);
    return best;
  }
  let complete = false;
  for (let depth=1;depth<=maxDepth;depth++) {
    try { last = solve(initial, [...remainingDice].sort(), depth, spectators, new Map()); }
    catch (e) { if (e === STOP) break; throw e; }
    reachedDepth = depth;
    complete = last[0].every((v,j) => Math.abs(v-last[1][j]) < 1e-12 && Math.abs(last[2][j]-last[3][j]) < 1e-12);
    onProgress({depth, nodes, complete});
    if (complete) break;
  }
  const ranges = Object.fromEntries(RACING_CAMELS.map((c,i) => [c,
    Array.from({length:5}, (_,r) => {
      const j=i*5+r;
      return { low: last[0][j], high: last[3][j],
        minimum: [last[0][j],last[1][j]], maximum: [last[2][j],last[3][j]] };
    })]));
  return { ranges, complete, reachedDepth, nodes, layoutsChecked,
    elapsedMs: performance.now()-start, editionId };
}


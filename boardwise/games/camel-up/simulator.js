export const RACING_CAMELS = ['Blue', 'Green', 'Orange', 'Yellow', 'White'];
export const CRAZY_CAMELS = ['CrazyWhite', 'CrazyBlack'];
export const GRAY_DIE = 'Gray';
export const TRACK_MIN = 1;
export const TRACK_MAX = 16;

export const EDITIONS = {
  classic: {
    id: 'classic',
    activeCamels: [...RACING_CAMELS],
    dice: [...RACING_CAMELS],
  },
  crazy: {
    id: 'crazy',
    activeCamels: [...RACING_CAMELS, ...CRAZY_CAMELS],
    dice: [...RACING_CAMELS, GRAY_DIE],
  },
};

export function factorial(n) {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
}

export function permutationsCount(n, r) {
  if (r < 0 || r > n) return 0;
  let value = 1;
  for (let i = 0; i < r; i += 1) value *= (n - i);
  return value;
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function fractionString(numerator, denominator) {
  if (numerator === 0) return '0';
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

export function isRacingCamel(camel) {
  return RACING_CAMELS.includes(camel);
}

export function isCrazyCamel(camel) {
  return CRAZY_CAMELS.includes(camel);
}

export function getEdition(id) {
  const edition = EDITIONS[id];
  if (!edition) throw new Error(`Unknown edition: ${id}`);
  return edition;
}

export function rollsRemainingThisLeg(editionId, remainingDiceCount) {
  if (editionId === 'crazy') return Math.max(0, remainingDiceCount - 1);
  return remainingDiceCount;
}

function cloneState(state) {
  const stacks = new Map();
  for (const [tile, stack] of state.stacks.entries()) stacks.set(tile, [...stack]);
  return { stacks };
}

export function buildState(positions, editionId = 'classic') {
  const { activeCamels } = getEdition(editionId);
  const stacks = new Map();

  for (const camel of activeCamels) {
    const position = positions[camel];
    if (!position) throw new Error(`Missing position for ${camel}.`);

    const tile = Number(position.tile);
    const stack = Number(position.stack);
    if (!stacks.has(tile)) stacks.set(tile, []);
    stacks.get(tile).push({ camel, stack });
  }

  for (const [tile, entries] of stacks.entries()) {
    entries.sort((a, b) => a.stack - b.stack);
    stacks.set(tile, entries.map((entry) => entry.camel));
  }

  return { stacks };
}

export function stateToPositions(state, activeCamels = [...RACING_CAMELS, ...CRAZY_CAMELS]) {
  const positions = {};
  for (const [tile, stack] of state.stacks.entries()) {
    stack.forEach((camel, index) => {
      if (activeCamels.includes(camel)) positions[camel] = { tile, stack: index };
    });
  }
  return positions;
}

export function validateSetup(positions, remainingDice, spectators, editionId = 'classic') {
  const errors = [];
  const { activeCamels, dice } = getEdition(editionId);
  const occupied = new Map();

  for (const camel of activeCamels) {
    const position = positions[camel];
    if (!position) {
      errors.push(`${displayCamelName(camel)} has not been placed on the board.`);
      continue;
    }

    const tile = Number(position.tile);
    const stack = Number(position.stack);

    if (!Number.isInteger(tile) || tile < TRACK_MIN || tile > TRACK_MAX) {
      errors.push(`${displayCamelName(camel)}: tile must be from ${TRACK_MIN} to ${TRACK_MAX}.`);
      continue;
    }
    if (!Number.isInteger(stack) || stack < 0 || stack > activeCamels.length - 1) {
      errors.push(`${displayCamelName(camel)}: invalid stack position.`);
      continue;
    }

    if (!occupied.has(tile)) occupied.set(tile, []);
    occupied.get(tile).push({ camel, stack });
  }

  for (const [tile, entries] of occupied.entries()) {
    const actual = entries.map((entry) => entry.stack).sort((a, b) => a - b);
    const expected = Array.from({ length: entries.length }, (_, index) => index);
    if (new Set(actual).size !== actual.length || actual.join(',') !== expected.join(',')) {
      errors.push(`Tile ${tile}: camel stack order is invalid.`);
    }
  }

  const remainingSet = new Set(remainingDice);
  for (const die of remainingDice) {
    if (!dice.includes(die)) errors.push(`Unknown die still in pyramid: ${die}.`);
  }
  if (remainingSet.size !== remainingDice.length) errors.push('Remaining dice contain duplicates.');

  const spectatorTiles = Object.keys(spectators).map(Number).sort((a, b) => a - b);
  for (const tile of spectatorTiles) {
    if (!Number.isInteger(tile) || tile < 2 || tile > TRACK_MAX) {
      errors.push(`Spectator tile ${tile}: spectator tiles may only be placed on spaces 2–${TRACK_MAX}.`);
      continue;
    }
    if (!['oasis', 'mirage'].includes(spectators[tile])) {
      errors.push(`Spectator tile ${tile}: effect must be Oasis +1 or Mirage −1.`);
    }
    if (occupied.has(tile)) errors.push(`Spectator tile ${tile}: cannot overlap a camel.`);
  }

  for (let i = 1; i < spectatorTiles.length; i += 1) {
    if (spectatorTiles[i] - spectatorTiles[i - 1] === 1) {
      errors.push(`Spectator tiles ${spectatorTiles[i - 1]} and ${spectatorTiles[i]} cannot be adjacent.`);
    }
  }

  return errors;
}

export function displayCamelName(camel) {
  if (camel === 'CrazyWhite') return 'Crazy White';
  if (camel === 'CrazyBlack') return 'Crazy Black';
  return camel;
}

function locateCamel(state, camel) {
  for (const [tile, stack] of state.stacks.entries()) {
    const index = stack.indexOf(camel);
    if (index !== -1) return { tile, index, stack };
  }
  throw new Error(`Camel ${camel} is not present in the state.`);
}

function removeMovingStack(next, located) {
  const movingStack = located.stack.slice(located.index);
  const stayBehind = located.stack.slice(0, located.index);
  if (stayBehind.length) next.stacks.set(located.tile, stayBehind);
  else next.stacks.delete(located.tile);
  return movingStack;
}

/**
 * Move one specific camel. Stack arrays are bottom -> top.
 * Racing camels move clockwise (+). Crazy camels move counterclockwise (-).
 * Normal/Cheering landing goes on top. Booing landing goes underneath.
 */
export function moveCamel(state, camel, steps, spectators = {}) {
  const next = cloneState(state);
  const located = locateCamel(next, camel);
  const movingStack = removeMovingStack(next, located);
  const direction = isCrazyCamel(camel) ? -1 : 1;

  let rawDestination = located.tile + direction * Number(steps);

  if (rawDestination > TRACK_MAX || rawDestination < TRACK_MIN) {
    const residents = next.stacks.get(rawDestination) ?? [];
    next.stacks.set(rawDestination, [...residents, ...movingStack]);
    return {
      state: next,
      crossedFinish: true,
      rawDestination,
      finalDestination: rawDestination,
      effect: null,
    };
  }

  const effect = spectators[rawDestination] ?? null;
  let finalDestination = rawDestination;

  if (effect === 'oasis') finalDestination += direction;
  if (effect === 'mirage') finalDestination -= direction;

  const crossedFinish = finalDestination > TRACK_MAX || finalDestination < TRACK_MIN;
  const residents = next.stacks.get(finalDestination) ?? [];
  const merged = effect === 'mirage'
    ? [...movingStack, ...residents]
    : [...residents, ...movingStack];
  next.stacks.set(finalDestination, merged);

  return {
    state: next,
    crossedFinish,
    rawDestination,
    finalDestination,
    effect,
  };
}

function crazyCamelCarryingRacer(state, crazyCamel) {
  const located = locateCamel(state, crazyCamel);
  return located.stack.slice(located.index + 1).some(isRacingCamel);
}

export function resolveCrazyCamel(state, faceColor) {
  const white = locateCamel(state, 'CrazyWhite');
  const black = locateCamel(state, 'CrazyBlack');

  if (white.tile === black.tile && Math.abs(white.index - black.index) === 1) {
    return white.index > black.index ? 'CrazyWhite' : 'CrazyBlack';
  }

  const whiteCarries = crazyCamelCarryingRacer(state, 'CrazyWhite');
  const blackCarries = crazyCamelCarryingRacer(state, 'CrazyBlack');
  if (whiteCarries !== blackCarries) return whiteCarries ? 'CrazyWhite' : 'CrazyBlack';

  return faceColor === 'white' ? 'CrazyWhite' : 'CrazyBlack';
}

export function moveGrayDie(state, faceColor, steps, spectators = {}) {
  const camel = resolveCrazyCamel(state, faceColor);
  return { ...moveCamel(state, camel, steps, spectators), camel };
}

export function rankRacingCamels(state) {
  const ranked = [];
  const tiles = [...state.stacks.keys()].sort((a, b) => b - a);
  for (const tile of tiles) {
    const stack = state.stacks.get(tile);
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (isRacingCamel(stack[i])) ranked.push(stack[i]);
    }
  }
  return ranked;
}

function createCountTable() {
  return Object.fromEntries(RACING_CAMELS.map((camel) => [camel, [0, 0, 0, 0, 0]]));
}

function addOutcome(counts, ranking, weight) {
  ranking.forEach((camel, placeIndex) => {
    counts[camel][placeIndex] += weight;
  });
}

function dieFaces(die, editionId) {
  if (editionId === 'crazy' && die === GRAY_DIE) {
    return [
      { faceColor: 'white', steps: 1, weight: 1 },
      { faceColor: 'white', steps: 2, weight: 1 },
      { faceColor: 'white', steps: 3, weight: 1 },
      { faceColor: 'black', steps: 1, weight: 1 },
      { faceColor: 'black', steps: 2, weight: 1 },
      { faceColor: 'black', steps: 3, weight: 1 },
    ];
  }

  if (editionId === 'crazy') {
    return [1, 2, 3].map((steps) => ({ steps, weight: 2 }));
  }

  return [1, 2, 3].map((steps) => ({ steps, weight: 1 }));
}

function faceWeightBase(editionId) {
  return editionId === 'crazy' ? 6 : 3;
}

export function simulateExact(
  positions,
  remainingDice,
  spectators = {},
  { editionId = 'classic', stopAtFinish = true } = {},
) {
  const errors = validateSetup(positions, remainingDice, spectators, editionId);
  if (errors.length) {
    const error = new Error(errors.join('\n'));
    error.validationErrors = errors;
    throw error;
  }

  const initialState = buildState(positions, editionId);
  const counts = createCountTable();
  const rollsToMake = rollsRemainingThisLeg(editionId, remainingDice.length);
  const base = faceWeightBase(editionId);
  const totalWeight = permutationsCount(remainingDice.length, rollsToMake) * (base ** rollsToMake);
  let terminalBranches = 0;

  function suffixWeight(remainingCount, rollsStillNeeded) {
    return permutationsCount(remainingCount, rollsStillNeeded) * (base ** rollsStillNeeded);
  }

  function recurse(state, remaining, rollsLeft, pathWeight) {
    if (rollsLeft === 0) {
      addOutcome(counts, rankRacingCamels(state), pathWeight);
      terminalBranches += 1;
      return;
    }

    for (let i = 0; i < remaining.length; i += 1) {
      const die = remaining[i];
      const nextRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];

      for (const face of dieFaces(die, editionId)) {
        const moved = die === GRAY_DIE
          ? moveGrayDie(state, face.faceColor, face.steps, spectators)
          : moveCamel(state, die, face.steps, spectators);

        const nextWeight = pathWeight * face.weight;
        if (stopAtFinish && moved.crossedFinish) {
          const rest = rollsLeft - 1;
          const fullWeight = nextWeight * suffixWeight(nextRemaining.length, rest);
          addOutcome(counts, rankRacingCamels(moved.state), fullWeight);
          terminalBranches += 1;
        } else {
          recurse(moved.state, nextRemaining, rollsLeft - 1, nextWeight);
        }
      }
    }
  }

  if (rollsToMake === 0) {
    addOutcome(counts, rankRacingCamels(initialState), 1);
    terminalBranches = 1;
  } else {
    recurse(initialState, [...remainingDice], rollsToMake, 1);
  }

  for (const camel of RACING_CAMELS) {
    const sum = counts[camel].reduce((a, b) => a + b, 0);
    if (sum !== totalWeight) {
      throw new Error(`Internal probability error for ${camel}: ${sum} != ${totalWeight}.`);
    }
  }

  return {
    counts,
    totalWeight,
    terminalBranches,
    rollsToMake,
    editionId,
  };
}


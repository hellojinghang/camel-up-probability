import { calculateRaceRanges } from './race-range.js';
import { simulateExact } from './simulator.js';

self.onmessage = (event) => {
  try {
    const { positions, remainingDice, spectators, editionId } = event.data;
    if (event.data.mode === 'race') {
      const result = calculateRaceRanges(positions, remainingDice, spectators, {
        editionId, timeLimitMs: event.data.timeLimitMs, maxNodes: 500000,
        onProgress: progress => self.postMessage({progress}),
      });
      self.postMessage({ok: true, result});
      return;
    }
    const result = simulateExact(positions, remainingDice, spectators, {
      editionId,
      stopAtFinish: true,
    });
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error.message,
      validationErrors: error.validationErrors ?? null,
    });
  }
};


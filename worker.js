import { simulateExact } from './simulator.js';

self.onmessage = (event) => {
  try {
    const { positions, remainingDice, spectators, editionId } = event.data;
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

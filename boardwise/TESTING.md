# Test record — BoardWise 0.1.0

## Automated checks

PASS: original race-range and leg regression suite.
PASS: 14 BoardWise tests. Conservation test covers all 32 classic and 64 second-edition remaining-dice subsets and checks both row and column integer sums.
PASS: JavaScript syntax checks for the UI and worker.

A concrete inherited defect was repaired: Crazy Camels used to wrap past the start line instead of terminating the race. Tests now cover a lone backward crossing and a backward crossing while carrying a racer.

## Browser checks

Hosted browser smoke tests are pending for this initial deployment. A local Playwright browser download was unavailable in the execution environment. Do not interpret automated engine tests as visual or cross-browser certification.

## Manual device checklist

- Phone portrait at 360–430 CSS pixels: board, controls, results and navigation remain usable.
- Tablet and desktop: no accidental horizontal page scrolling; text and tables readable.
- Safari / Chrome / Firefox: calculate, cancel, edit, undo and change edition.
- Invalid spectator tiles: visible error, unchanged valid board.
- Save, reopen, JSON export/import and scenario links preserve stack order and dice.
- Reload restores working board; local saves survive closing/reopening.
- After one online load, reopen offline and calculate. Install/add-to-home-screen depends on browser support.
- Near-finish positions: no outcomes after the first finish crossing.
- Academy: correct/incorrect answer feedback and attempt count.

## Known alpha limits

- English only; one game module; four fixed training exercises.
- Data stays on one browser. Export files for backups.
- Full race output remains a broad, potentially unresolved model envelope, not a forecast.
- No player ownership / turn schedule model, automatic board recognition, payments or cloud sync.
- Optional offline install behavior has not yet been tested across mobile operating systems.

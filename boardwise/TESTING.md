# Test record — BoardWise 0.1.0

## Automated checks

PASS: original race-range and leg regression suite.
PASS: 14 BoardWise tests. Conservation test covers all 32 classic and 64 second-edition remaining-dice subsets and checks both row and column integer sums.
PASS: JavaScript syntax checks for the UI and worker.

A concrete inherited defect was repaired: Crazy Camels used to wrap past the start line instead of terminating the race. Tests now cover a lone backward crossing and a backward crossing while carrying a racer.

## Browser checks

PASS in hosted Chromium: classic current-leg analysis, second-edition analysis (5,598,720 weighted outcomes), ticket controls, stale-result invalidation, saving and reopening a scenario, Academy scoring/feedback, and cancelling game-end search.

PASS visual inspection: desktop layout and phone layout in a 390 px outer-width iframe (373 px content viewport with browser scrollbar). The narrow document scrollWidth equaled its clientWidth, and its calculation completed. This uses a real narrow browsing context, not an actual phone.

The responsive harness is available at `tests/responsive.html` for repeatable 390 / 768 / 1280 px inspection. A local Playwright browser download was unavailable; hosted browser checks were used instead. Actual iOS/Android devices, offline reopen/install, other browser engines, and JSON download/import roundtrip still need manual testing.

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

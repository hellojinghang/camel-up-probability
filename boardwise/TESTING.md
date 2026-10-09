# Version 0.2 verification

PASS: original engine/range regression suite, 14 v0.1 tests, and 8 new v0.2 tests.
- Generated scenarios checked at 100 seeds in each of two modes, including reproducibility and exact-engine agreement.
- Comparison deltas, identical scenarios, unavailable tickets and edition mismatch.
- Full-playbook JSON roundtrip, equivalent-state deduplication, old-save preservation and atomic invalid/over-limit rejection.
- JavaScript syntax validation.

PASS hosted Chromium:
- v0.1-to-v0.2 update with an existing saved scenario preserved.
- Live calculation, baseline pinning, changed board and probability/EV comparison.
- Generated ticket-value challenge, answer feedback and complete calculated score table.
- Playbook download and reimport through the file chooser: duplicate skipped and original retained.
- 390 px outer-width responsive harness (373 px content viewport): all four navigation choices visible; document scrollWidth equals clientWidth.

Deployment: GitHub Pages build succeeded. The offline installer now reloads release assets from the network to prevent an older HTTP-cached app shell from being installed into a new cache. Close all v0.1 tabs and reopen after the first refresh to activate this upgrade. No saved browser data needs to be cleared.

Actual mobile hardware, offline-only reopen/install and other browser engines remain manual test items.

## Version 0.1 verification history



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

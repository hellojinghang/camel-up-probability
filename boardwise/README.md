# BoardWise 0.2.0 — testing release

A zero-build, browser-only board game companion. This second test release covers Camel Up in Live Assistant and Strategy Academy. No account, paid backend, tracking or payment collection.

## Open / run

Hosted as the `boardwise/` subdirectory of the existing Camel Up GitHub Pages project. The original dashboard is unchanged.

For local use, serve the repository over HTTP (do not double-click index.html):

```sh
python -m http.server 8000
# Open http://localhost:8000/boardwise/
```

Tests: `npm test --prefix boardwise` from the repository root, or `npm test` inside this directory. No dependency installation is needed.

## First test

1. Open **Live Assistant** and load **Stack puzzle**.
2. Select a camel, tap a space, and use **Lower / Raise** to arrange its stack. This is a board editor, not a simulated roll.
3. Mark dice still inside the pyramid. **New leg** refills dice and removes spectator tiles.
4. Calculate. Inspect all five rank probabilities and change each next available ticket (5 / 3 / 2 / None) to compare EV.
5. Change the board: previous results must disappear. **Undo** restores the previous board.
6. Save a scenario, open **Saved scenarios**, export it, and import it again. Saves are local to this browser, not cloud synced.
7. Try **Strategy Academy**. Four guided lessons and generated probability / ticket-value challenges share the live calculation engine; progress counts attempts, including repeats.
8. Test the second edition, including Crazy Camels and its five-of-six-dice leg limit.
9. Optionally run the experimental game-end bounds. Cancel should leave the UI usable.
10. In **Testing & methodology**, describe a defect and download the test report. Send the report with your feedback. No report is sent automatically.

## Correctness and scope

- Current-leg results enumerate every remaining die order and face using integer weights. They are exact conditional on fair dice, uniform remaining-die selection, entered positions, and spectator tiles staying fixed throughout the leg. Percentages and EV are rounded for display.
- Stack height determines ordering on a shared space. A moving camel carries everything above it.
- The second edition's legacy `White` racing identifier is displayed as **Purple**, separate from **Crazy White**. Export files retain that internal identifier.
- Fixed a defect inherited from the original simulator: a Crazy Camel crossing the finish line backwards now ends the race, even without a racer on its back. Carried racers remain behind the start line and rank last. The upstream engine wrapped them to the front instead.
- Official rules checked against the publisher's English rulebook: https://www.lookout-spiele.de/upload/de_camelup.html_CamelUp_PZE30070_Rules_EN_WEB_240305.pdf (sections: movement, legs, end of game).
- Ticket EV = payout × P(first) + P(second) − P(third through fifth). It compares leg tickets, not complete strategies. Opponent turns, ticket opportunity costs and future tile movements are not modeled.
- Game-end output is an experimental envelope over anonymous future tile arrangements; it is **not an exact win forecast**. The search allows legal layouts to be reconsidered before each roll without modeling turn/ownership constraints. Unfinished endpoints are outer bounds; each camel/rank endpoint is optimized separately. See `games/camel-up/ENGINE_NOTES.md`.
- No ownership/player-count validation for spectator tiles. Use a legal physical board; the app validates positions and nonadjacency only.
- No multiplayer, match hosting, camera recognition, accounts, real-money payments or other game modules in this alpha.

## Architecture

- `games/registry.js`: game registry.
- `games/camel-up/plugin.js`: scenario schema, editor operations, probabilities and EV.
- `games/camel-up/simulator.js`: pure movement and exact leg enumeration.
- `games/camel-up/race-range.js`: bounded future-layout search.
- `worker.js`: cancellable background calculations. Editing the board invalidates results and stops pending work.
- `app.js`: responsive UI, exercises, validated local import/export, saves and reporting.
- `sw.js` + manifest: scoped offline app shell. No cross-site caching. Bump cache version when changing release assets. An updated worker activates after old tabs close, preserving one coherent release per session.

The engine and original range regression suite were adapted from `hellojinghang/camel-up-probability` main at commit `23f6dd4465f63181427bec305040380fa26ba488`. Existing root files were not edited.

## Verification

- Existing leg/range regression suite passes.
- 14 additional automated tests cover carrying, spectator effects, crazy-die resolution, backward/forward finish, hand-calculated probabilities and EV, input validation, editor operations, and all rank marginal sums across all 96 edition/dice subsets.
- Browser verification and remaining limitations are recorded in `TESTING.md`.

## Next release gates

1. User testing on actual phones and real game states, followed by fixes.
2. Further independent engine/reference-state verification before commercial correctness claims.
3. Broader scenario training, scenario comparison and accessibility refinements.
4. Secure server-side purchase verification before any premium access.
5. A second game only after the shared plugin contract and first-game UX are stable.


## Version 0.2 changes

- Pin a calculated baseline, change board/dice/tiles or tickets, and recalculate to compare first-place probabilities (percentage-point change) and ticket EV. Restore the baseline with one click. Baselines last for the current tab session; saved scenarios remain durable browser storage.
- Generated classic-rule probability and ticket-EV practice. Each answer is evaluated by the shared engine. Guided lessons remain available; navigating away preserves the current exercise. Open an answered exercise in Live Assistant for further study.
- Back up the full playbook as one JSON file; restore merges with existing saves, skips equivalent named scenarios, validates every entry before writing, and rejects oversized imports atomically.
- Larger text/touch targets and a two-row mobile navigation. On narrow layouts a completed live calculation scrolls to its results.
- Shared scenario URLs are consumed once, so later edits survive reload instead of reimporting the original URL state.
- A waiting-update prompt supports future service-worker upgrades. For the first upgrade from v0.1, close all old BoardWise tabs and reopen once to allow the new release to activate.

The v0.2 release keeps the v0.1 movement and probability engines unchanged. 8 additional tests cover comparison, generated practice across 100 seeds in each mode, backup roundtrips, deduplication and atomic rejection. Browser checks are documented in TESTING.md.

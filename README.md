# Camel Up Probability Dashboard

A browser-only calculator hosted on GitHub Pages. No backend, account, paid service or build step is required.

## Calculations

- **Current leg:** exact weighted enumeration with existing spectator tiles and remaining dice.
- **Game end (Option C):** minimum and maximum probability of each finishing position across anonymous future tile arrangements. Every camel/rank endpoint is optimized separately; endpoints are not one joint probability distribution.

### Placement model

The entered spectator tiles apply to the next roll. If the current leg has already ended, they are cleared first. From the following roll onwards, any legal arrangement may be chosen before the die and face are revealed. An arrangement can depend on previous outcomes, never on an unseen future roll. No tile ownership, player count, turn scheduling or strategy likelihood is assumed. Thus this is a broad envelope, not a prediction of human behaviour or a guarantee that every policy fits a particular player/turn schedule.

All arrangements of relevant empty spaces are considered, including no tiles, oasis and mirage. Space 1, occupied spaces and adjacent tiles are excluded. Since the model permits rearrangement before every roll, spaces that cannot be landed on in the upcoming roll can be omitted without changing that roll or its continuation. Relevant spaces are recalculated for every future state. This pruning must not be reused for layouts fixed over a whole leg.

Movement uses the existing simulator, including stack order, carrying, Crazy Camel direction and grey-die selection. The pyramid refills at each leg boundary. Crossing the finish ends the race immediately.

Classic spectator placement rules: https://images.zmangames.com/filer_public/88/09/8809b7bb-3a30-44ea-88db-a4683056794c/zm7480_camel_up_rules.pdf
Second-edition rules: https://www.lookout-spiele.de/upload/de_camelup.html_CamelUp_PZE30070_Rules_EN_WEB_240305.pdf

### Search limits and interpretation

This implementation enumerates outcomes, not Monte Carlo samples. It uses iterative lookahead and memoization with a time budget (8, 30 or 60 seconds), a 500,000 expanded-state budget and a maximum lookahead of 40 rolls. A completed depth replaces the previous result; an interrupted depth is discarded. Unresolved future branches are bounded by probabilities 0 and 1.

For every objective the engine tracks an interval for the minimum and an interval for the maximum. Random outcomes are probability-weighted first; only then are minimum/maximum operators applied across tile choices. This prevents choices from anticipating dice outcomes. The table displays the lower bound on the minimum and upper bound on the maximum. Unfinished bounds are rounded outward to two decimal places.

**Early-race calculations may still show 0–100%.** They are explicitly labelled unfinished outer bounds, not exact winning ranges or confidence intervals. The current implementation does not promise exhaustive whole-game solutions for arbitrary starting positions. Completed ranges are identified when endpoint intervals agree to floating-point tolerance (1e-12); percentages use ordinary double precision, not rational arithmetic. The current-leg calculator still uses its exact weighted counts.

## Use

Set the edition, place all camels, enter active oasis/mirage tiles and mark remaining dice. Use the current-leg button or the separate game-end range button. Game-end calculation runs in its own cancellable worker. Changing the board or dice invalidates old game-end results. On phones, ranges appear as cards.

## Development

```sh
npm test
python -m http.server 8000
```

Open http://localhost:8000. Upload all application files to the repository root; GitHub Pages can serve the main branch directly. No dependency installation is required.

`tests.mjs` checks one-roll results against the existing exact engine, a hand-calculated two-roll race, classic/crazy leg resets, bounded-depth containment, full versus pruned tile layouts, stacking, finish handling, invalid input and budget exhaustion.
